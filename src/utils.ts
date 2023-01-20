export function validityDatePair(validityDurationMinutes: number) {
  const issued = new Date()
  const expires = new Date(issued.getTime() + validityDurationMinutes * 60 * 1000)
  return { issued: issued, expires: expires }
}

export function parseXboxAuthorization(authorization?: string): { userId: string, tokenString: string } | null {
  if (authorization == null) {
    return null
  }

  const parts1 = authorization.split(' ', 2)
  if (parts1.length != 2 || parts1[0] != 'XBL3.0') {
    return null
  }

  const parts2 = parts1[1].split('=', 2)
  if (parts2.length != 2 || parts2[0] != 'x') {
    return null
  }

  const parts3 = parts2[1].split(';', 2)
  if (parts3.length != 2) {
    return null
  }

  return { userId: parts3[0], tokenString: parts3[1] }
}