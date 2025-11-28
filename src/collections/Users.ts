import { User } from '@/payload-types'
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {},
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
    admin: () => true,
  },
  fields: [
    {
      name: 'username',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'picUrl',
      type: 'text',
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'isVerified',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'token',
      type: 'text',
      index: true,
    },
  ],
  endpoints: [
    {
      path: '/login',
      method: 'get',
      handler: async ({ headers, query, payload }) => {
        console.log('/login')
        try {
          const code = headers.get('code')
          const redirectUri = query.redirect_uri

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
          if (!shortToken.ok) return Response.json({ success: false }, { status: 400 })

          const { access_token: shortAccessToken } = await shortToken.json()

          const longToken = await fetch(
            `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${clientSecret}&access_token=${shortAccessToken}`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            },
          )

          if (!longToken.ok) return Response.json({ success: false }, { status: 400 })
          const { access_token: longAccessToken } = await longToken.json()

          const getMe = await fetch(
            `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography,is_verified&access_token=${longAccessToken}`,
          )

          if (!getMe.ok) return Response.json({ success: false }, { status: 400 })
          const { username, name, threads_profile_picture_url, threads_biography, is_verified } =
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
                username,
                name,
                picUrl: threads_profile_picture_url,
                bio: threads_biography,
                isVerified: is_verified,
              },
            })
          }

          await payload.update({
            collection: 'users',
            id: user.id,
            data: { token: longAccessToken },
          })

          return Response.json({ success: true, accessToken: longAccessToken, user })
        } catch (e) {
          return Response.json({ success: false }, { status: 500 })
        }
      },
    },
  ],
}
