# Overview

```
Module Name:  R2B2 Bid Adapter
Module Type:  Bidder Adapter
Maintainer: lukas.alexandr@r2b2.cz
```

# Description

Connects to R2B2's exchange for bids.

R2B2 bid adapter supports only Banner at present

# Sample Ad Unit: For Publishers

```
var adUnits = [
{
    code: 'r2b2-provided-code-123456',
    sizes: [
        [480, 300]
    ],
    bids: [{
        bidder: 'r2b2',
        params: {
            d: 'my-domain.com',
            g: 'article',
            p: '480x300',
            m: 1 // optional, defauls to 0
        }
    }]
}
```
