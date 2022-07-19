
import 'reflect-metadata'

import { MikroORM } from '@mikro-orm/core'
import { COOKIE_NAME, __prod__ } from './constants'
// import { Post } from './entities/Post'
import cors from 'cors'
import express from 'express'
import microConfig from './mikro-orm.config'

import { ApolloServer } from 'apollo-server-express'
import { buildSchema } from 'type-graphql'
import { HelloResolver } from './resolvers/hello'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'

import * as redis from 'redis'
// import redis from 'ioredis'
import connectRedis from 'connect-redis'
import session from 'express-session'

const main = async () => {
  const orm = await MikroORM.init(microConfig)
  await orm.getMigrator().up()

  const app = express()

  const RedisStore = connectRedis(session)
  //  https://github.com/benawad/lireddit/issues/48#issuecomment-1005183713
  const redisClient = redis.createClient({ legacyMode: true })
  await redisClient.connect();

  app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
  }))

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redisClient,
        disableTouch: true
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: 'lax',
        secure: __prod__
      },
      saveUninitialized: false,
      secret: 'blorbigkeit',
      resave: false
    })
  )

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false
    }),
    context: ({ req, res }) => ({ em: orm.em, req, res })
  })

  apolloServer.applyMiddleware({
    app,
    cors: false
  })

  app.listen(4000, () => {
    console.log('server started on localhost:4000')
  })
}

main().catch((err) => {
  console.error(err)
})

// console.log('hello there')s