import { User } from '@/payload-types'
import type { CollectionConfig } from 'payload'
import { UsersEndpoints } from './endpoints'

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
      hidden: true,
    },
  ],
  endpoints: UsersEndpoints.routes,
}
