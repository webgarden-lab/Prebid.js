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

const newBidderRequestWithEmptyMediaTypesAndSetSizes = () =>
  Object.assign(newBidderRequest(), { sizes: [[300, 250]] })

describe('r2b2BidAdapter', function() {
  describe('isBidRequestValid', function() {
    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(newBidRequest())).to.equal(true)
    })

    it('should return false when required params are not passed', function() {
      let br = newBidRequest()
      delete br.params
      expect(spec.isBidRequestValid(br)).to.equal(false)
    })
  })

  describe('buildRequests', function() {
    const bidRequests = [newBidRequest()]
    it('uses POST method', function() {
      const request = spec.buildRequests(bidRequests)
      expect(request.method).to.equal('POST')
    })

    it('will return empty imp if no bidderRequest passed', function() {
      const request = spec.buildRequests(bidRequests)
      expect(request.data.imp.length).to.equal(0)
    })

    it('starts with empty placements', function() {
      expect(spec.placements.length).to.equal(0)
    })

    it('clears placements each time', function() {
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

    it('accepts sizes if mediaTypes is empty', function() {
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
  })
})
