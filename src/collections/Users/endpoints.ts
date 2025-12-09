import { User } from '@/payload-types'
import { Endpoint, PayloadRequest } from 'payload'
import { Threads } from '../../threads/Threads'
import { ThreadsPostsResponse } from '@/threads/ThreadsPosts'

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
      {
        path: '/me/posts',
        method: 'get',
        handler: this.posts,
      },
    ]
  }

  async login({ headers, query, payload }: PayloadRequest): Promise<Response> {
    console.log('/login')
    try {
      const code = headers.get('Code')
      const redirectUri = query.redirect_uri as string
      if (!code || !redirectUri) {
        return Response.json({ success: false, message: 'No code or redirectUri' }, { status: 400 })
      }

      const shortAccessToken = await Threads.shortToken(redirectUri, code)
      if (!shortAccessToken) {
        return Response.json({ success: false, data: shortAccessToken }, { status: 400 })
      }

      const longAccessToken = await Threads.longToken(shortAccessToken)
      if (!longAccessToken) {
        return Response.json({ success: false, data: longAccessToken }, { status: 400 })
      }

      const getMe = await Threads.getMe(longAccessToken)
      if (!getMe) return Response.json({ success: false }, { status: 400 })
      const {
        threadsId,
        username,
        name,
        threads_biography,
        threads_profile_picture_url,
        is_verified,
      } = getMe

      let user: User = (
        await payload.find({
          collection: 'users',
          where: { threadsId: { equals: threadsId } },
        })
      ).docs[0]

      if (!user) {
        user = await payload.create({
          collection: 'users',
          data: {
            threadsId,
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

  async me({ headers, payload }: PayloadRequest): Promise<Response> {
    console.log('/me')
    try {
      const accessToken = headers.get('Authorization')?.split(' ')[1]
      if (!accessToken) {
        return Response.json({ success: false, message: 'No access token' }, { status: 400 })
      }

      const getMe = await Threads.getMe(accessToken)
      if (!getMe) return Response.json({ success: false }, { status: 400 })
      const {
        threadsId,
        username,
        name,
        threads_profile_picture_url,
        threads_biography,
        is_verified,
      } = await getMe

      let user: User = (
        await payload.find({
          collection: 'users',
          where: { threadsId: { equals: threadsId } },
        })
      ).docs[0]

      if (!user) return Response.json({ success: false }, { status: 404 })

      user = await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          threadsId,
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

  async posts(req: PayloadRequest): Promise<Response> {
    console.log('/posts')
    try {
      const accessToken = req.headers.get('Authorization')?.split(' ')[1]
      if (!accessToken) {
        return Response.json({ success: false, message: 'No access token' }, { status: 400 })
      }
      const afterQuery = req.query.after as string

      let postsResponse: ThreadsPostsResponse | null
      if (afterQuery) {
        postsResponse = await Threads.getPosts(accessToken, afterQuery)
      } else {
        postsResponse = await Threads.getPosts(accessToken)
      }

      if (!postsResponse) return Response.json({ success: false }, { status: 400 })
      const { data: posts, paging } = postsResponse
      const after = paging.cursors.after

      return Response.json({ success: true, posts, after })
    } catch (e) {
      return Response.json({ success: false }, { status: 500 })
    }
  }
}

export const UsersEndpoints = new Users()
