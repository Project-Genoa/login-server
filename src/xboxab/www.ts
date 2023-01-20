import Express from 'express'
const router = Express.Router()

router.get('/ab', (req, res) => {
  // TODO: there is some variation in the returned values and it is not clear what all of these flags do - see packet captures
  res.send({
    Features: [
      'mc-sunsetting_1',
      'mc-reco-algo2simfirst',
      'mc-rp-hero-row-timer-2',
      'mc-signaling-usewebsockets',
      'mc-signaling-useturn',
      'mcmktvlt-offerids-recos_lgbm3c',
      'mc-cloud-file-upload',
      'mc-oneds-prod',
      'mc-realms-cayman',
      'mc-realms-libhttp',
      'mc-rp-morelicensedsidebar',
      'control-tower-says-yes',
      'raknet-enabled',
      'mc-rp-nycbanner3',
      'mc-rp-risinglava'
    ],
    Flights: {
      '28kk': 'mc-sunsetting_1',
      '2mky': 'mc-reco-algo2simfirst',
      '2qco': 'mc-rp-hero-row-timer-2',
      '2x69': 'mc-signaling-usewebsockets',
      '2x6m': 'mc-signaling-useturn',
      '3gfd': 'mcmktvlt-offerids-recos_lgbm3c',
      '3gth': 'mc-cloud-file-upload',
      '3gw8': 'mc-oneds-prod',
      '3iu5': 'mc-realms-cayman',
      '3ol8': 'mc-realms-libhttp',
      '4geb': 'mc-rp-morelicensedsidebar',
      '4j7l': 'control-tower-says-yes',
      '4o5r': 'raknet-enabled',
      '4p1g': 'mc-rp-nycbanner3',
      '4pan': 'mc-rp-risinglava'
    },
    Configs: [
      {
        Id: 'Minecraft',
        Parameters: {
          'sunsetting': true,
          'algo': "two",
          'fjkdsafjlkdsafdjlk': true,
          'mc-signaling-usewebsockets': true,
          'mc-signaling-useturn': true,
          'lgbm3c': true,
          'mc-cloud-file-upload': true,
          'mc-oneds-prod': true,
          'ennables_realms_cayman_sub': true,
          'mc-realms-libhttp-treatment-032922': true,
          'dfasdfsfd': true,
          'mc-control-tower-says-yes': true,
          'mc-bedrock-host-raknet': true,
          'nyc3banner132023': true,
          'withbuttonart132023': true
        }
      }
    ],
    ParameterGroups: [],
    FlightingVersion: 53520025,
    ImpressionId: '667E4E0EC48D48D58139C88B2BFA6E0E',
    AssignmentContext: 'mc-sunsetting_1:30259009;mc-reco-algo2simfirst:30617967;mc-rp-hero-row-timer-2:30321236;mc-signaling-usewebsockets:30418088;mc-signaling-useturn:30357350;mcmktvlt-offerids-recos_lgbm3c:30622925;mc-cloud-file-upload:30440330;mc-oneds-prod:30450267;mc-realms-cayman:30606215;mc-realms-libhttp:30526657;mc-rp-morelicensedsidebar:30594955;control-tower-says-yes:30600225;raknet-enabled:30640316;mc-rp-nycbanner3:30636461;mc-rp-risinglava:30636462;'
  })
})

export = router