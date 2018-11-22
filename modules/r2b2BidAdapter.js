import { registerBidder } from 'src/adapters/bidderFactory'
import { BANNER, VIDEO } from 'src/mediaTypes'
import * as utils from 'src/utils'
import { config } from 'src/config'

const getConfig = config.getConfig
const getParams = ({ d, g, p, m }) => ({ d, g, p, m })

export const spec = {
  code: 'r2b2',
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO],
  placements: [],

  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.d && bid.params.g && bid.params.p)
  },

  buildRequests: function(bidRequests, bidderRequest) {
    this.placements.splice(0)
    const _addPlacement = params => {
      this.placements.push(getParams(params))
    }

    let imps = []
    if (bidderRequest && utils.isArray(bidderRequest.bids)) {
      imps = bidderRequest.bids.map(adUnit => {
        _addPlacement(adUnit.params)

        let banner
        if (utils.isEmpty(adUnit.mediaTypes) && utils.isArray(adUnit.sizes)) {
          const format = adUnit.sizes.map(size => ({
            w: size[0],
            h: size[1]
          }))
          banner = { format }
        }

        const bannerParams = utils.deepAccess(adUnit, 'mediaTypes.banner')
        if (bannerParams && bannerParams.sizes) {
          const sizes = utils.parseSizesInput(bannerParams.sizes)

          const format = sizes.map(size => {
            const [width, height] = size.split('x')
            const w = parseInt(width, 10)
            const h = parseInt(height, 10)
            return { w, h }
          })

          banner = { format }
        }

        let video
        const videoParams = utils.deepAccess(adUnit, 'mediaTypes.video')
        if (!utils.isEmpty(videoParams)) {
          video = videoParams
        }

        const ext = {}
        ext[adUnit.bidder] = adUnit.params

        const imp = { id: adUnit.adUnitCode, ext }

        if (banner) {
          imp.banner = banner
        }
        if (video) {
          imp.video = video
        }

        return imp
      })
    }

    const tid = utils.generateUUID()
    const data = {
      id: tid,
      source: { tid },
      tmax: 1000,
      imp: imps,
      test: getConfig('debug') ? 1 : 0
    }

    return {
      method: 'POST',
      url: '//hb.trackad.cz/openrtb2/bid',
      data,
      bids: bidRequests
    }
  },

  interpretResponse: function(serverResponse, request) {
    try {
      let bidObject, bid, response, type
      let bidRespones = []
      let bids = request.bids
      let responses = serverResponse.body.seatbid
      if (responses) {
        for (let i = 0; i < responses.length; i++) {
          response = responses[i].bid[0]
          bid = bids[i]
          type = 'banner'
          if (response && bid) {
            bidObject = {
              requestId: bid.bidId,
              cpm: response.price,
              width: response.w,
              height: response.h,
              creativeId: response.crid,
              currency: 'EUR',
              netRevenue: true,
              ttl: 360,
              ad: response.adm,
              bidderCode: 'r2b2',
              transactionId: bid.transactionId,
              mediaType: type
            }

            bidRespones.push(bidObject)
          }
        }
      }

      return bidRespones
    } catch (e) {
      return []
    }
  },

  getUserSyncs: function(syncOptions = {}) {
    if (syncOptions.iframeEnabled) {
      const placementsStr = JSON.stringify(this.placements)
      return [
        {
          type: 'iframe',
          url: '//hb.trackad.cz/cookieSync?p=' + btoa(placementsStr)
        }
      ]
    }
    return []
  }
}

registerBidder(spec)
