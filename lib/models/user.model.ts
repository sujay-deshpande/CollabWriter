import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  id: { type: String, required: true },
  email: { type: String, required: true },
  imageUrl: { type: String, required: true },
  name: { type: String, required: true },
  username: { type: String, required: true },
  bio: { type: String, required: true },
  document:[
    {
      type:mongoose.Schema.Types.ObjectId,
      ref:'Document'
    }
  ],
  projects:[
    {
      type:mongoose.Schema.Types.ObjectId,
      ref:'Document'
    }
  ],
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;