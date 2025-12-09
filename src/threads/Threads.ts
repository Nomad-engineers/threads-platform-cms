import { ThreadsPostsResponse } from './ThreadsPosts'
import { ThreadsUser } from './ThreadsUser'

export class Threads {
  static async shortToken(redirectUri: string, code: string): Promise<string | null> {
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
    if (!shortToken.ok) return null
    const { access_token } = await shortToken.json()
    return access_token as string
  }

  static async longToken(shortAccessToken: string): Promise<string | null> {
    const clientSecret = process.env.THREADS_CLIENT_SECRET!
    const longToken = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${clientSecret}&access_token=${shortAccessToken}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
    )
    if (!longToken.ok) return null
    const { access_token } = await longToken.json()
    return access_token as string
  }

  static async getMe(accessToken: string): Promise<ThreadsUser | null> {
    const queryParams = {
      fields: 'id,username,name,threads_profile_picture_url,threads_biography,is_verified',
      access_token: accessToken,
    }

    const queryString = new URLSearchParams(queryParams).toString()
    const me = await fetch(`https://graph.threads.net/v1.0/me?${queryString}`)
    if (!me.ok) return null
    const {
      id: threadsId,
      username,
      name,
      threads_profile_picture_url,
      threads_biography,
      is_verified,
    } = await me.json()

    return {
      threadsId,
      username,
      name,
      threads_profile_picture_url,
      threads_biography,
      is_verified,
    }
  }

  static async getPosts(
    accessToken: string,
    after: string = '',
  ): Promise<ThreadsPostsResponse | null> {
    let queryParams: {
      fields: string
      access_token: string
      limit: string
      after?: string
    } = {
      fields:
        'id,media_product_type,media_type,media_url,permalink,owner,username,text,topic_tag,timestamp,shortcode,thumbnail_url,children,is_quote_post',
      access_token: accessToken,
      limit: '100',
    }
    if (after) queryParams.after = after

    const queryString = new URLSearchParams(queryParams).toString()
    const posts = await fetch(`https://graph.threads.net/v1.0/me/threads?${queryString}`)
    if (!posts.ok) return null
    const postResponse = (await posts.json()) as ThreadsPostsResponse
    return postResponse
  }
}
