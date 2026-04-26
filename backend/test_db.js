const mongoose = require('mongoose');

const uri = "mongodb://Vishmi:Vishmi%40123@ac-bupgglv-shard-00-00.nsgdjhn.mongodb.net:27017,ac-bupgglv-shard-00-01.nsgdjhn.mongodb.net:27017,ac-bupgglv-shard-00-02.nsgdjhn.mongodb.net:27017/?ssl=true&replicaSet=atlas-bupgglv-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Vishmi";

mongoose.connect(uri)
  .then(() => {
    console.log("SUCCESS!");
    process.exit(0);
  })
  .catch(err => {
    console.error("FAIL:", err.message);
    process.exit(1);
  });
