const mongoose = require('mongoose');

const uri = 'mongodb+srv://wmt:Vishmi%40123@ac-bzuxayh.l6d3u1d.mongodb.net/test?retryWrites=true&w=majority';

mongoose.connect(uri)
  .then(() => {
    console.log('✅ Connected to Atlas!');
    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
