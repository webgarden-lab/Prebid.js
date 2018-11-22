import { expect } from 'chai'
import { spec } from 'modules/r2b2BidAdapter'

const newBidRequest = () => ({
  bidder: 'r2b2',
  sizes: [[300, 250]],
  renderMode: 'banner',
  params: {
    d: 'domain',
    g: 'group',
    p: 'position'
  }
})

const newParams = (extra = {}) =>
  Object.assign(
    {
      d: 'domain',
      g: 'group',
      p: 'position'
    },
    extra
  )

const newAdUnit = (extra = {}) =>
  Object.assign(
    {
      bidder: 'some-bidder',
      mediaTypes: newMediaTypesBannerSizes(),
      params: newParams()
    },
    extra
  )

const newMediaTypesBannerSizes = () => ({
  banner: {
    sizes: '300x250'
  }
})

const newBidderRequest = (extra = {}) =>
  Object.assign(
    {
      bids: []
    },
    extra
  )

describe('r2b2BidAdapter', () => {
  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(newBidRequest())).to.equal(true)
    })

    it('should return false when required params are not passed', () => {
      let br = newBidRequest()
      delete br.params
      expect(spec.isBidRequestValid(br)).to.equal(false)
    })
  })

  describe('buildRequests', () => {
    const bidRequests = [newBidRequest()]
    it('uses POST method', () => {
      const request = spec.buildRequests(bidRequests)
      expect(request.method).to.equal('POST')
    })

    it('will return empty imp if no bidderRequest passed', () => {
      const request = spec.buildRequests(bidRequests)
      expect(request.data.imp.length).to.equal(0)
    })

    it('starts with empty placements', () => {
      expect(spec.placements.length).to.equal(0)
    })

    it('clears placements each time', () => {
      spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [newAdUnit()]
        })
      )
      expect(spec.placements.length).to.equal(1)

      spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [newAdUnit(), newAdUnit()]
        })
      )
      expect(spec.placements.length).to.equal(2)
    })

    it('accepts sizes if mediaTypes is empty', () => {
      let bid = newAdUnit({ sizes: [[300, 250]] })
      delete bid['mediaTypes']
      const request = spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [bid]
        })
      )
      expect(request.data.imp[0].banner.format).to.deep.equal([
        {
          w: 300,
          h: 250
        }
      ])
    })

    it('accepts sizes if mediaTypes.banner is not empty', () => {
      let bid = newAdUnit()
      const request = spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [bid]
        })
      )
      expect(request.data.imp[0].banner.format).to.deep.equal([
        {
          w: 300,
          h: 250
        }
      ])
    })

    it('does not contain banner if is not able get its sizes', () => {
      let bid = newAdUnit()
      delete bid['mediaTypes']
      const request = spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [bid]
        })
      )
      expect(request.data.imp[0].banner).to.be.undefined
    })

    it('accepts mediaTypes.video', () => {
      const video = { video: true }
      const bid = newAdUnit()
      bid.mediaTypes.video = video
      const request = spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [bid]
        })
      )
      expect(request.data.imp[0].video).to.deep.equal(video)
    })

    it('does not contain video mediaTypes.video is not set', () => {
      const bid = newAdUnit()
      const request = spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [bid]
        })
      )
      expect(request.data.imp[0].video).to.be.undefined
    })

    it('contains ext with bidder code', () => {
      const bid = newAdUnit()
      const request = spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [bid]
        })
      )
      expect(request.data.imp[0].ext).to.have.all.keys('some-bidder')
    })

    it('expects request with defined method, url, data and bids', () => {
      const bid = newAdUnit()
      const request = spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [bid]
        })
      )
      expect(request).to.have.all.keys('method', 'url', 'data', 'bids')
    })
  })

  describe('interpretResponse', () => {
    // todo
  })

  describe('getUserSyncs', () => {
    it('returns user syncs only if syncOptions.iframeEnabled is truthy', () => {
      const placements = [{ a: 1 }, { b: 2 }]
      spec.placements = placements
      const syncs = spec.getUserSyncs({ iframeEnabled: true })

      expect(syncs).to.deep.equal([
        {
          type: 'iframe',
          url:
            '//hb.trackad.cz/cookieSync?p=' + btoa(JSON.stringify(placements))
        }
      ])
    })

    it('returns empty array if syncOptions.iframeEnabled is not truthy', () => {
      const syncs = spec.getUserSyncs()
      expect(syncs).to.deep.equal([])
    })
  })
})
