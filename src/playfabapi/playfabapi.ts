import * as Runtypes from 'runtypes'
import Express from 'express'
const router = Express.Router()

import * as jwt from '../jwt'
import TokenTypes from '../token_types'
import * as utils from '../utils'

import config from '../config'

function validatePlayfabTitleID(titleId: string): boolean {
  return titleId.match(/^[0-9A-F]{5}$/) ? true : false
}

const LoginWithCustomIDRequest = Runtypes.Record({
  TitleId: Runtypes.String.withConstraint(value => validatePlayfabTitleID(value)),
  EncryptedRequest: Runtypes.Null,
  PlayerSecret: Runtypes.Null,
  CreateAccount: Runtypes.Boolean,
  CustomId: Runtypes.String
})

router.post('/Client/LoginWithCustomID', (req, res) => {
  const request = LoginWithCustomIDRequest.validate(req.body)
  if (!request.success) {
    res.status(400)
    res.end()
    return
  }

  //res.status(403)
  //res.end()
  res.send({
    code: 403,
    status: 'Forbidden',
    error: 'NotAuthorizedByTitle',
    errorCode: 1191,
    errorMessage: 'Action not authorized by title'
  })
})

const LoginWithXboxRequest = Runtypes.Record({
  TitleId: Runtypes.String.withConstraint(value => validatePlayfabTitleID(value)),
  EncryptedRequest: Runtypes.Null,
  PlayerSecret: Runtypes.Null,
  CreateAccount: Runtypes.Boolean,
  XboxToken: Runtypes.String
})

router.post('/Client/LoginWithXbox', (req, res) => {
  const request = LoginWithXboxRequest.validate(req.body)
  if (!request.success) {
    res.status(400)
    res.end()
    return
  }

  const authorization = utils.parseXboxAuthorization(request.value.XboxToken)
  if (authorization == null) {
    res.status(400)
    res.end()
    return
  }
  const xboxToken = jwt.verify<TokenTypes.Shared.PlayfabXboxToken>(authorization.tokenString, config.xboxlive.playfabTokenSecret)
  if (xboxToken == null || xboxToken.data.userId != authorization.userId) {
    // TODO: probably supposed to use a "fake 403" as with LoginWithCustomID
    res.status(403)
    res.end()
    return
  }

  const userId = xboxToken.data.userId

  const sessionTicketValidity = utils.validityDatePair(config.playfabapi.sessionTicketValidityMinutes)
  const sessionTicket: TokenTypes.Shared.PlayfabSessionTicket = { userId: userId }
  const sessionTicketString = jwt.sign(sessionTicket, config.playfabapi.sessionTicketSecret, sessionTicketValidity.issued, sessionTicketValidity.expires)

  const entityTokenValidity = utils.validityDatePair(config.playfabapi.entityTokenValidityMinutes)
  const entityToken: TokenTypes.Playfab.EntityToken = { id: userId, type: 'title_player_account' }
  const entityTokenString = jwt.sign(entityToken, config.playfabapi.entityTokenSecret, entityTokenValidity.issued, entityTokenValidity.expires)

  res.send({
    code: 200,
    status: 'OK',
    data: {
      SessionTicket: userId.toUpperCase() + '-' + sessionTicketString,
      PlayFabId: userId,
      NewlyCreated: false,
      SettingsForUser: {
        NeedsAttribution: false,
        GatherDeviceInfo: true,
        GatherFocusInfo: true,
      },
      LastLoginTime: new Date(0),
      InfoResultPayload: {
        AccountInfo: {
          PlayFabId: userId,
          Created: new Date(0),
          TitleInfo: {
            Origination: 'XboxLive',
            Created: new Date(0),
            LastLogin: new Date(0),
            FirstLogin: new Date(0),
            isBanned: false,
            TitlePlayerAccount: {
              Id: userId,
              Type: 'title_player_account',
              TypeString: 'title_player_account'
            }
          },
          PrivateInfo: {},
          XboxInfo: {
            XboxUserId: userId,
            XboxUserSandbox: 'RETAIL'
          }
        },
        UserInventory: [],
        UserDataVersion: 0,
        UserReadOnlyDataVersion: 0,
        CharacterInventories: [],
        PlayerProfile: {
          PublisherId: 'B63A0803D3653643',
          TitleId: request.value.TitleId,
          PlayerId: userId
        }
      },
      EntityToken: {
        EntityToken: entityTokenString,
        TokenExpiration: entityTokenValidity.expires,
        Entity: {
          Id: entityToken.id,
          Type: entityToken.type,
          TypeString: entityToken.type
        }
      },
      TreatmentAssignment: {
        Variants: [],
        Variables: []
      }
    }
  })
})

const GetEntityTokenRequest = Runtypes.Record({
  Entity: Runtypes.Record({
    Id: Runtypes.String,
    Type: Runtypes.String
  })
})

router.post('/Authentication/GetEntityToken', (req, res) => {
  const request = GetEntityTokenRequest.validate(req.body)
  if (!request.success) {
    res.status(400)
    res.end()
    return
  }
  const tokenString = req.header('X-EntityToken')
  if (tokenString == null) {
    res.status(400)
    res.end()
    return
  }
  const token = jwt.verify<TokenTypes.Playfab.EntityToken>(tokenString, config.playfabapi.entityTokenSecret)
  if (token == null) {
    res.status(403)
    res.end()
    return
  }

  if (request.value.Entity.Type == 'master_player_account') {
    if (token.data.type != 'title_player_account' || token.data.id != request.value.Entity.Id) {
      res.status(403)
      res.end()
      return
    }

    const entityTokenValidity = utils.validityDatePair(config.playfabapi.entityTokenValidityMinutes)
    const entityToken: TokenTypes.Playfab.EntityToken = { id: request.value.Entity.Id, type: request.value.Entity.Type }
    const entityTokenString = jwt.sign(entityToken, config.playfabapi.entityTokenSecret, entityTokenValidity.issued, entityTokenValidity.expires)

    res.send({
      code: 200,
      status: 'OK',
      data: {
        EntityToken: entityTokenString,
        TokenExpiration: entityTokenValidity.expires,
        Entity: {
          Id: entityToken.id,
          Type: entityToken.type,
          TypeString: entityToken.type
        }
      }
    })
    return
  }
  else {
    res.status(400)
    res.end()
    return
  }
})

const GetObjectsRequest = Runtypes.Record({
  Entity: Runtypes.Record({
    Id: Runtypes.String,
    Type: Runtypes.String
  }),
  EscapeObject: Runtypes.Null
})

router.post('/Object/GetObjects', (req, res) => {
  const request = GetObjectsRequest.validate(req.body)
  if (!request.success) {
    res.status(400)
    res.end()
    return
  }
  const tokenString = req.header('X-EntityToken')
  if (tokenString == null) {
    res.status(400)
    res.end()
    return
  }
  const token = jwt.verify<TokenTypes.Playfab.EntityToken>(tokenString, config.playfabapi.entityTokenSecret)
  if (token == null || token.data.id != request.value.Entity.Id || token.data.type != request.value.Entity.Type) {
    res.status(403)
    res.end()
    return
  }

  if (request.value.Entity.Type == 'master_player_account') {
    // TODO
    res.send({
      code: 200,
      status: 'OK',
      data: {
        ProfileVersion: 6,
        Objects: {
          personaProfile: {
            ObjectName: 'personaProfile',
            DataObject: {
              personaCollection: {
                universalApp: [
                  {
                    id: 'c18e65aa-7b21-4637-9b63-8ad63622ef01_Steve',
                    isPlatformLocked: false,
                    isTitleLocked: false,
                    lastUsedPersonaSlot: 'persona_profile_persona4',
                    packId: 'c18e65aa-7b21-4637-9b63-8ad63622ef01',
                    typeId: 'skin'
                  }
                ]
              },
              version: '0.0.1'
            }
          },
          personaProfile2: {
            ObjectName: 'personaProfile2',
            DataObject: {
              personaCollection: {
                universalApp: [
                  {
                    arm: 'wide',
                    skcol: '#ffb37b62',
                    skin: false
                  },
                  {
                    id: '8f96d1f8-e9bb-40d2-acc8-eb79746c5d7c/d'
                  },
                  {
                    id: '1042557f-d1f9-44e3-ba78-f404e8fb7363/d'
                  },
                  {
                    id: 'f1e4c577-19ba-4d77-9222-47f145857f78/d'
                  },
                  {
                    id: '49f93789-a512-4c47-95cb-0606cdc1c2be/d'
                  },
                  {
                    id: '68bfe60d-f30a-422f-b32c-72374ebdd057/d'
                  },
                  {
                    id: 'b6702f0e-a4b5-497a-8820-6c8e3946bb55/d'
                  },
                  {
                    col: ['#0', '#0', '#ff774235', '#0'],
                    id: '52dd0726-cd68-4d7d-8561-515a4866de39/d'
                  },
                  {
                    col: ['#ff523d89', '#0', '#0', '#0'],
                    id: 'a0f263b3-e093-4c85-aadb-3759417898ff/d'
                  },
                  {
                    col: ['#ff2f1f0f', '#0', '#0', '#0'],
                    id: '2bb1473b-9a5c-4eae-9fd5-82302a6aa3da/d'
                  }
                ]
              },
              version: '0.0.1'
            }
          },
          personaProfile3: {
            ObjectName: 'personaProfile3',
            DataObject: {
              personaCollection: {
                universalApp: [
                  {
                    arm: 'wide',
                    skcol: '#ffb37b62',
                    skin: false
                  },
                  {
                    id: ''
                  },
                  {
                    id: '8f96d1f8-e9bb-40d2-acc8-eb79746c5d7c/d'
                  },
                  {
                    id: '1042557f-d1f9-44e3-ba78-f404e8fb7363/d'
                  },
                  {
                    id: 'f1e4c577-19ba-4d77-9222-47f145857f78/d'
                  },
                  {
                    id: '49f93789-a512-4c47-95cb-0606cdc1c2be/d'
                  },
                  {
                    id: '68bfe60d-f30a-422f-b32c-72374ebdd057/d'
                  },
                  {
                    id: 'b6702f0e-a4b5-497a-8820-6c8e3946bb55/d'
                  },
                  {
                    col: ['#0', '#0', '#ff774235', '#0'],
                    id: '52dd0726-cd68-4d7d-8561-515a4866de39/d'
                  },
                  {
                    col: ['#ff523d89', '#0', '#0', '#0'],
                    id: 'a0f263b3-e093-4c85-aadb-3759417898ff/d'
                  },
                  {
                    col: ['#ff2f1f0f', '#0', '#0', '#0'],
                    id: '2bb1473b-9a5c-4eae-9fd5-82302a6aa3da/d'
                  }
                ]
              },
              version: '0.0.1'
            }
          },
          personaProfile4: {
            ObjectName: 'personaProfile4',
            DataObject: {
              personaCollection: {
                universalApp: [
                  {
                    arm: 'slim',
                    skcol: '#fff2dbbd',
                    skin: true
                  },
                  {
                    id: '8f96d1f8-e9bb-40d2-acc8-eb79746c5d7c/d'
                  },
                  {
                    id: '1042557f-d1f9-44e3-ba78-f404e8fb7363/d'
                  },
                  {
                    id: '0948e089-6f9c-40c1-886b-cd37add03f69/d'
                  },
                  {
                    id: '96db6e5b-dc69-4ebc-bd36-cb1b08ffb0f4/d'
                  },
                  {
                    id: '5f64b737-b88a-40ea-be1f-559840237146/d'
                  },
                  {
                    col: ['#0', '#0', '#ffefbbb1', '#0'],
                    id: '83c940ce-d7b8-4603-8d73-c1234e322cce/d'
                  },
                  {
                    col: ['#ff236224', '#0', '#0', '#0'],
                    id: 'a0f263b3-e093-4c85-aadb-3759417898ff/d'
                  },
                  {
                    col: ['#ffe89d4c', '#0', '#0', '#0'],
                    id: '70be0801-a93f-4ce0-8e3f-7fdeac1e03b9/d'
                  },
                  {
                    id: '80eda582-cda7-4fce-9d6f-89a60f2448f1/d'
                  }
                ]
              },
              version: '0.0.1'
            }
          }
        },
        Entity: {
          Id: request.value.Entity.Id,
          Type: request.value.Entity.Type,
          TypeString: request.value.Entity.Type
        }
      }
    })
    return
  }
  else {
    res.status(400)
    res.end()
    return
  }
})

const SetObjectsRequest = Runtypes.Record({
  Entity: Runtypes.Record({
    Id: Runtypes.String,
    Type: Runtypes.String
  }),
  Objects: Runtypes.Record({
    // TODO
  })
})

router.post('/Object/SetObjects', (req, res) => {
  const request = SetObjectsRequest.validate(req.body)
  if (!request.success) {
    res.status(400)
    res.end()
    return
  }
  const tokenString = req.header('X-EntityToken')
  if (tokenString == null) {
    res.status(400)
    res.end()
    return
  }
  const token = jwt.verify<TokenTypes.Playfab.EntityToken>(tokenString, config.playfabapi.entityTokenSecret)
  if (token == null || token.data.id != request.value.Entity.Id || token.data.type != request.value.Entity.Type) {
    res.status(403)
    res.end()
    return
  }

  if (request.value.Entity.Type == 'master_player_account') {
    // TODO
    res.end()
    return
  }
  else {
    res.status(400)
    res.end()
    return
  }
})

const GetPlayerStatisticsRequest = Runtypes.Record({
  StatisticNames: Runtypes.Array(Runtypes.String)
})

router.post('/Client/GetPlayerStatistics', (req, res) => {
  const request = GetPlayerStatisticsRequest.validate(req.body)
  if (!request.success) {
    res.status(400)
    res.end()
    return
  }
  const tokenString = req.header('X-Authorization')?.match(/^[0-9A-F]{16}-(.*)$/)?.[1]
  if (tokenString == null) {
    res.status(400)
    res.end()
    return
  }
  const token = jwt.verify<TokenTypes.Shared.PlayfabSessionTicket>(tokenString, config.playfabapi.sessionTicketSecret)
  if (token == null) {
    res.status(403)
    res.end()
    return
  }

  const statistics: { [field: string]: number } = {
    BlocksPlaced: 0,
    BlocksCollected: 0,
    Deaths: 0,
    ItemsCrafted: 0,
    ItemsSmelted: 0,
    ToolsBroken: 0,
    MobsKilled: 0,
    BuildplateSeconds: 0,
    SharedBuildplateViews: 0,
    AdventuresPlayed: 0,
    TappablesCollected: 0,
    MobsCollected: 0,
    ChallengesCompleted: 0
  }

  res.send({
    code: 200,
    status: 'OK',
    data: {
      Statistics: request.value.StatisticNames.filter(field => field in statistics).map(field => { return { StatisticName: field, Value: statistics[field] } })
    }
  })
})

export = router