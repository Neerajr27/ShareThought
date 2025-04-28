const { name } = require('ejs');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/mini', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB Connected Successfully ✅");
  })
  .catch((err) => {
    console.error("MongoDB Connection Error ❌:", err);
  });
const userSchema = mongoose.Schema({
    name: String,
    username: String,
    age: Number,
    email: String,
    password: String,
    posts:[
        {type:mongoose.Schema.Types.ObjectId,ref: "post"}
    ]
})

module.exports=mongoose.model('user',userSchema);