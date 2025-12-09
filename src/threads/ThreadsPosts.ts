export interface ThreadsPostsResponse {
  data: Array<ThreadsPosts>
  paging: ThreadsPaging
}

export interface ThreadsPosts {
  id: string
  media_product_type: string
  media_type: string
  permalink: string
  owner: ThreadsPostsOwner
  username: string
  text: string
  topic_tag: string
  timestamp: string
  shortcode: string
  is_quote_post: boolean
}
interface ThreadsPostsOwner {
  id: string
}

export interface ThreadsPaging {
  cursors: ThreadsCursors
}
export interface ThreadsCursors {
  before: string
  after: string
}
