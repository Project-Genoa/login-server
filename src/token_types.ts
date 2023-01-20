export namespace TokenTypes {
  export namespace Live {
    export interface UserToken {
      userId: string,
      username: string,
      passwordSalt: string,
      passwordHash: string
    }

    export interface DeviceToken {
      // empty
    }
  }

  export namespace Xbox {
    export interface DeviceToken {
      type: 'device',
      did: string
    }

    export interface TitleToken {
      type: 'title',
      tid: string
    }

    export interface UserToken {
      type: 'user',
      xid: string,
      uhs: string,

      userId: string,
      username: string
    }

    export type AuthToken = DeviceToken | TitleToken | UserToken

    export interface XapiToken {
      userId: string,
      username: string
    }
  }

  export namespace Playfab {
    export interface EntityToken {
      id: string,
      type: string
    }
  }

  export namespace Shared {
    export interface XboxTicketToken {
      userId: string,
      username: string
    }

    export interface PlayfabXboxToken {
      userId: string
    }

    export interface PlayfabSessionTicket {
      userId: string
    }
  }
}

export default TokenTypes