const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://Vishmi:Vishmi%40123@vishmi.nsgdjhn.mongodb.net/?retryWrites=true&w=majority&appName=Vishmi";

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully to server");
  } catch (err) {
    console.dir(err);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
