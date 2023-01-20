import jwt from 'jsonwebtoken'

export type Token<T extends object> = {
  issued: Date,
  expires: Date,
  expired?: boolean,
  data: TokenData<T>
}
export type TokenData<T extends object> = T

export function sign<T extends object>(token: Token<T>, secret: string): string
export function sign<T extends object>(data: TokenData<T>, secret: string, issued: Date, expires: Date): string
export function sign<T extends object>(token: Token<T> | TokenData<T>, secret: string, issued?: Date, expires?: Date): string {
  var data
  if (issued === undefined || expires === undefined) {
    issued = (token as Token<T>).issued
    expires = (token as Token<T>).expires
    data = (token as Token<T>).data
  }
  else {
    data = token as TokenData<T>
  }

  const payload = {
    iat: Math.floor(issued.getTime() / 1000),
    exp: Math.floor(expires.getTime() / 1000),
    data: data
  }
  return jwt.sign(payload, Buffer.from(secret, 'base64'), { algorithm: 'HS256' })
}

export function verify<T extends object>(token: string, secret: string, allowExpired: boolean = false): Token<T> | null {
  try {
    const payload = jwt.verify(token, Buffer.from(secret, 'base64'), { algorithms: ['HS256'], ignoreExpiration: allowExpired })
    if (typeof payload == 'string') {
      return null
    }
    if (typeof payload.iat != 'number' || typeof payload.exp != 'number') {
      return null
    }
    if (typeof payload.data != 'object') {
      return null
    }
    return { issued: new Date(payload.iat * 1000), expires: new Date(payload.exp * 1000), data: payload.data, expired: allowExpired && payload.exp * 1000 < new Date().getTime() }
  }
  catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return null
    }
    else {
      throw err
    }
  }
}