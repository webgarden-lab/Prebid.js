import { registerBidder } from 'src/adapters/bidderFactory'
import { BANNER, VIDEO } from 'src/mediaTypes'
import * as utils from 'src/utils'
import { config } from 'src/config'

const getParams = ({ d, g, p, m }) => ({ d, g, p, m })

const BIDDER_CODE = 'r2b2'
const LOG_PREFIX = 'r2b2Adapter::'
export const spec = {
  code: BIDDER_CODE,
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO],
  placements: [],

  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.d && bid.params.g && bid.params.p)
  },

  buildRequests: function(bidRequests, bidderRequest) {
    this.placements.splice(0)

    let imps = []
    if (bidderRequest && utils.isArray(bidderRequest.bids)) {
      imps = bidderRequest.bids.map(adUnit => {
        this.placements.push(getParams(adUnit.params))

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
      test: config.getConfig('debug') ? 1 : 0
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
      const bidResponses = []
      const bids = request.bids
      const responses = serverResponse.body.seatbid
      if (utils.isArray(responses) && utils.isArray(bids)) {
        for (let i = 0; i < responses.length; i++) {
          const response = responses[i].bid[0]
          const bid = bids[i]
          const mediaType = BANNER
          if (utils.isPlainObject(response) && utils.isPlainObject(bid)) {
            const bidObject = {
              requestId: bid.bidId,
              cpm: response.price,
              width: response.w,
              height: response.h,
              creativeId: response.crid,
              currency: 'EUR',
              netRevenue: true,
              ttl: 360,
              ad: response.adm,
              bidderCode: BIDDER_CODE,
              transactionId: bid.transactionId,
              mediaType
            }

            bidResponses.push(bidObject)
          }
        }
      }

      return bidResponses
    } catch (e) {
      utils.logError(LOG_PREFIX + 'interpretResponse failed', e)
      return []
    }
  },

  getUserSyncs: function(syncOptions = {}) {
    if (syncOptions.iframeEnabled) {
      const placementsArg = btoa(JSON.stringify(this.placements))
      const syncs = [
        {
          type: 'iframe',
          url: '//hb.trackad.cz/cookieSync?p=' + placementsArg
        }
      ]
      utils.logInfo(LOG_PREFIX + 'getUserSyncs', syncs)
      return syncs
    }
    utils.logInfo(
      LOG_PREFIX + 'getUserSyncs - syncOptions.iframeEnabled is not truthy'
    )
    return []
  }
}

registerBidder(spec)
