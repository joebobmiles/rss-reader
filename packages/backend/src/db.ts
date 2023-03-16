
import { MongoClient, ServerApiVersion } from 'mongodb'

const client = new MongoClient(
  process.env.DB_CONNECTION_STRING ?? '',
  {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
    }
  }
)

let connection
try {
  connection = await client.connect()
} catch (e) {
  console.error(e)
}

const db = connection?.db('hullabaloo')

export default db
