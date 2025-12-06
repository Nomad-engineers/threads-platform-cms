import { User } from '@/payload-types'
import { Endpoint, PayloadRequest } from 'payload'

class Users {
  get routes(): Omit<Endpoint, 'root'>[] {
    return [
      {
        path: '/login',
        method: 'get',
        handler: this.login,
      },
      {
        path: '/login/:id',
        method: 'get',
        handler: this.loginById,
      },
      {
        path: '/me',
        method: 'get',
        handler: this.me,
      },
    ]
  }

  async login({ headers, query, payload }: PayloadRequest): Promise<Response> {
    console.log('/login')
    try {
      const code = headers.get('Code')
      const redirectUri = query.redirect_uri
      if (!code || !redirectUri) {
        return Response.json({ success: false, message: 'No code or redirectUri' }, { status: 400 })
      }

      const clientId = process.env.THREADS_CLIENT_ID!
      const clientSecret = process.env.THREADS_CLIENT_SECRET!

      const shortToken = await fetch('https://graph.threads.net/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: code,
        }),
      })

      if (!shortToken.ok) {
        return Response.json({ success: false, data: await shortToken.json() }, { status: 400 })
      }

      const { access_token: shortAccessToken } = await shortToken.json()

      const longToken = await fetch(
        `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${clientSecret}&access_token=${shortAccessToken}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      )

      if (!longToken.ok) {
        return Response.json({ success: false, data: await longToken.json() }, { status: 400 })
      }
      const { access_token: longAccessToken } = await longToken.json()

      const getMe = await fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography,is_verified&access_token=${longAccessToken}`,
      )

      if (!getMe.ok) return Response.json({ success: false }, { status: 400 })
      const { id, username, name, threads_profile_picture_url, threads_biography, is_verified } =
        await getMe.json()

      let user: User = (
        await payload.find({
          collection: 'users',
          where: { username },
        })
      ).docs[0]

      if (!user) {
        user = await payload.create({
          collection: 'users',
          data: {
            id,
            username,
            name,
            picUrl: threads_profile_picture_url,
            bio: threads_biography,
            isVerified: is_verified,
          },
        })
      }

      user = await payload.update({
        collection: 'users',
        id: user.id,
        data: { token: longAccessToken },
      })

      return Response.json({ success: true, accessToken: longAccessToken, user })
    } catch (error) {
      return Response.json({ success: false, error }, { status: 500 })
    }
  }

  async me({ headers, payload }: PayloadRequest): Promise<Response> {
    console.log('/me')
    try {
      const accessToken = headers.get('Authorization')?.split(' ')[1]
      if (!accessToken) {
        return Response.json({ success: false, message: 'No access token' }, { status: 400 })
      }

      const queryParams = {
        fields: 'id,username,name,threads_profile_picture_url,threads_biography,is_verified',
        access_token: accessToken,
      }

      const queryString = new URLSearchParams(queryParams).toString()
      const getMe = await fetch(`https://graph.threads.net/v1.0/me?${queryString}`)

      if (!getMe.ok) return Response.json({ success: false }, { status: 400 })
      const { id, username, name, threads_profile_picture_url, threads_biography, is_verified } =
        await getMe.json()

      let user: User = await payload.findByID({
        collection: 'users',
        id,
      })

      if (!user) return Response.json({ success: false }, { status: 404 })

      user = await payload.update({
        collection: 'users',
        id,
        data: {
          id,
          username,
          name,
          bio: threads_biography,
          picUrl: threads_profile_picture_url,
          isVerified: is_verified,
        },
      })

      return Response.json({ success: true, user })
    } catch (e) {
      return Response.json({ success: false }, { status: 500 })
    }
  }

  async loginById(req: PayloadRequest): Promise<Response> {
    console.log('loginById')
    try {
      const id = +req.routeParams!.id!
      if (isNaN(id)) return Response.json({ success: false }, { status: 400 })

      const user = await req.payload.findByID({ collection: 'users', id, showHiddenFields: true })
      const accessToken = user.token
      delete user.token
      return Response.json({ success: true, accessToken, user })
    } catch (e) {
      return Response.json({ success: false }, { status: 500 })
    }
  }
}

export const UsersEndpoints = new Users()
