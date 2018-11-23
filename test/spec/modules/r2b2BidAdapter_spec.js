import { expect } from 'chai'
import { spec } from 'modules/r2b2BidAdapter'
import { config } from 'src/config'

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

const newServerResponse = (extra = {}) =>
  Object.assign(
    {
      body: {
        seatbid: [
          {
            bid: [
              {
                price: 1,
                w: 300,
                h: 250,
                crid: 'creativeId',
                adm: 'ad'
              }
            ]
          }
        ]
      }
    },
    extra
  )

describe('r2b2BidAdapter', () => {
  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(newBidRequest())).to.be.equal(true)
    })

    it('should return false when required params are not passed', () => {
      let br = newBidRequest()
      delete br.params
      expect(spec.isBidRequestValid(br)).to.be.equal(false)
    })
  })

  describe('buildRequests', () => {
    const bidRequests = [newBidRequest()]
    it('uses POST method', () => {
      const request = spec.buildRequests(bidRequests)
      expect(request.method).to.be.equal('POST')
    })

    it('will return empty imp if no bidderRequest passed', () => {
      const request = spec.buildRequests(bidRequests)
      expect(request.data.imp.length).to.be.equal(0)
    })

    it('starts with empty placements', () => {
      expect(spec.placements.length).to.be.equal(0)
    })

    it('clears placements each time', () => {
      spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [newAdUnit()]
        })
      )
      expect(spec.placements.length).to.be.equal(1)

      spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [newAdUnit(), newAdUnit()]
        })
      )
      expect(spec.placements.length).to.be.equal(2)
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

    it("will set test prop according to config.getConfig('debug') value", () => {
      let getConfigStub = sinon.stub(config, 'getConfig').returns(true)

      const bid = newAdUnit()
      const testIsOne = spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [bid]
        })
      )

      expect(testIsOne.data.test).to.be.equal(1)
      getConfigStub.restore()

      const testIsZero = spec.buildRequests(
        bidRequests,
        newBidderRequest({
          bids: [bid]
        })
      )
      getConfigStub = sinon.stub(config, 'getConfig').returns(false)
      expect(testIsZero.data.test).to.be.equal(0)
      getConfigStub.restore()
    })
  })

  describe('interpretResponse', () => {
    it('returns empty array if error is thrown', () => {
      // will break at serverResponse.body
      expect(spec.interpretResponse(undefined, { bids: [] })).to.deep.equal([])

      // will break at request.bids
      expect(spec.interpretResponse(undefined, undefined)).to.deep.equal([])

      // will break at responses[i].bid[0]
      expect(
        spec.interpretResponse(
          {
            body: {
              seatbid: [
                // no bid object
              ]
            }
          },
          { bids: [] }
        )
      ).to.deep.equal([])
    })

    it('returns empty array if bids or responses are not an array', () => {
      expect(
        spec.interpretResponse(
          {
            body: { seatbid: [] }
          },
          { bids: undefined }
        )
      ).to.deep.equal([])

      expect(
        spec.interpretResponse(
          {
            body: { seatbid: undefined }
          },
          { bids: [] }
        )
      ).to.deep.equal([])

      expect(
        spec.interpretResponse(
          {
            body: { seatbid: undefined }
          },
          { bids: undefined }
        )
      ).to.deep.equal([])
    })

    it('returns empty array if bid or response is not an object', () => {
      expect(
        spec.interpretResponse(
          {
            body: { seatbid: [{ bid: [undefined] }] }
          },
          { bids: [{}] }
        )
      ).to.deep.equal([])

      expect(
        spec.interpretResponse(
          {
            body: { seatbid: [{ bid: [{}] }] }
          },
          { bids: [undefined] }
        )
      ).to.deep.equal([])
    })

    it('returns array of bidObjects with correct shape', () => {
      const first = spec.interpretResponse(newServerResponse(), {
        bids: [{ bidId: 'bidId', transactionId: 'trId' }]
      })[0]
      expect(first).to.deep.equal({
        requestId: 'bidId',
        cpm: 1,
        width: 300,
        height: 250,
        creativeId: 'creativeId',
        currency: 'EUR',
        netRevenue: true,
        ttl: 360,
        ad: 'ad',
        bidderCode: 'r2b2',
        transactionId: 'trId',
        mediaType: 'banner'
      })
    })

    it('will always take first bid returned', () => {
      const response = newServerResponse()
      response.body.seatbid.concat({
        price: 2,
        w: 500,
        h: 600,
        crid: 'crid',
        adm: 'adm'
      })
      const expected = spec.interpretResponse(response, {
        bids: [
          { bidId: 'bidId', transactionId: 'trId' },
          {
            bidId: 'bidId2',
            transactionId: 'trId2'
          }
        ]
      })
      expect(expected).to.deep.equal([
        {
          requestId: 'bidId',
          cpm: 1,
          width: 300,
          height: 250,
          creativeId: 'creativeId',
          currency: 'EUR',
          netRevenue: true,
          ttl: 360,
          ad: 'ad',
          bidderCode: 'r2b2',
          transactionId: 'trId',
          mediaType: 'banner'
        }
      ])
    })
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
