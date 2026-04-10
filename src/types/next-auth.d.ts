import { DefaultSession, DefaultJWT } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      firstName: string
      lastName: string
      businessId: string
    } & DefaultSession['user']
  }

  interface User {
    role: string
    firstName: string
    lastName: string
    businessId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    role: string
    firstName: string
    lastName: string
    businessId: string
  }
}
