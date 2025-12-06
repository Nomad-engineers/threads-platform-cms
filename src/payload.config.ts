// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users/config'
import { Media } from './collections/Media'
import { Admins } from './collections/Admins'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  cors: {
    origins: '*',
    headers: ['Authorization', 'Content-Type', 'Code'],
  },
  admin: {
    user: Admins.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    autoRefresh: true,
    autoLogin: {
      email: 'admin@admin.com',
      password: 'admin123',
    },
  },
  collections: [Admins, Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
  }),
  sharp,
  plugins: [],
})
