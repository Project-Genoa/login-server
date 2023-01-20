type Config = {
  login: {
    soapHeaderValidityMinutes: number,

    userTokenValidityMinutes: number,
    deviceTokenValidityMinutes: number, // ignored when validating token because client doesn't refresh it when it expires anyway
    xboxTokenValidityMinutes: number,
    userTokenSecret: string,
    deviceTokenSecret: string,
    xboxTokenSecret: string, // TODO: use public key cryptography

    userTokenSessionKey: string, // TODO: key is supposed to be per-token and change with each token request

    useStableUserIds: boolean
  },

  xboxlive: {
    tokenValidityMinutes: number,
    authTokenSecret: string,
    xapiTokenSecret: string,
    playfabTokenSecret: string, // TODO: use public key cryptography

    // these determine the information that is used when returning the user profile fields, becasue we haven't implemented a database and these fields aren't stored in the token
    profileFields: {
      firstName: string,
      lastName: string,
      pictureURL: string
    }
  },

  playfabapi: {
    entityTokenValidityMinutes: number,
    sessionTicketValidityMinutes: number,
    entityTokenSecret: string,
    sessionTicketSecret: string, // TODO: use public key cryptography
  }

  environment: {
    liveBaseHost: string,
    xboxliveBaseHost: string,
    xboxabBaseHost: string,
    playfabapiBaseHost: string,

    protocol: 'http' | 'https',
    port: number,

    singleDomainMode: string | null,
  }
}

const config: Config = {
  login: {
    soapHeaderValidityMinutes: 1,

    userTokenValidityMinutes: 7 * 24 * 60,
    deviceTokenValidityMinutes: 1,
    xboxTokenValidityMinutes: 1 * 24 * 60,
    userTokenSecret: 'Mf5HWU566mwFuxxyXa2ACPvZVw9DTfzO4DREWk0aoxfkaVEhM6OfJRQ2MR1FhtPpVgkhEBBBG1PJvjy6LoO90A==',
    deviceTokenSecret: '2MonNUihCGLzZRhMMkZ6GgFFnxj0Jk60Mvhoa2NVaOW51cDd4ZKD8L5RAbgcO1R9vfs4V/JZE6KmWW16I0OesQ==',
    xboxTokenSecret: 'Q/cQFxZs/PahNgsNrvEOUAQ6RQ45MTAaRXH9LNpSrZpjQ99RBmyxuJwOcnkX6daCuVqdo8/eefpe1wUamn9YTA==',

    userTokenSessionKey: 'W1oCtEFI0XJjOW0c3oDJ/kWRR4Q7CSlE',

    useStableUserIds: true
  },

  xboxlive: {
    tokenValidityMinutes: 7 * 24 * 60,
    authTokenSecret: 'zcGJXsfsHik4UJeK/usZPbMnVUhlUdH8vzo4JewgpyAbfxglXP9BGQrOYUKzPsa4SWnzC4E8j8EfCOm9hBTGGw==',
    xapiTokenSecret: 'iDsUT5D6FP2K2h4IEwoquwBMc7Bdj8GuZbv3+1610EjEbBdoDo+4LJIKiUF+K6keBF+pWUsQIQpIYvdt0iCmBw==',
    playfabTokenSecret: 'Iewc7mNZ4RzXUimHvPauBquzwTZq5K2dWLnnpUHGji3TAMq6PiazPyb/2igVNK9dLjMUpzqoUvxnM/niCKuWOA==',

    profileFields: {
      firstName: 'Firstname',
      lastName: 'Lastname',
      pictureURL: ''
    }
  },

  playfabapi: {
    entityTokenValidityMinutes: 24 * 60,
    sessionTicketValidityMinutes: 24 * 60,
    entityTokenSecret: '/T7gV2UtfbN3OAsSFt1U73+DLocbc7HzBmywI4X2wFgr/yKcTo51UNJUAwiInJ08pWIqBUP9WoE/to4cBWUQlg==',
    sessionTicketSecret: 'mKpXyjZkqnzCLKqjdnpXqAYyYHL07I+Tbqs8j9HKJAe3MvRNOtjb59vp/vREJFg6WPOJ4g8AYfsRr107CQKp4Q=='
  },

  environment: {
    liveBaseHost: 'live.com',
    xboxliveBaseHost: 'xboxlive.com',
    xboxabBaseHost: 'xboxab.com',
    playfabapiBaseHost: 'playfabapi.com',

    protocol: 'http',
    port: 80,

    singleDomainMode: null
  }
}

export default config