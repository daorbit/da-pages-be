import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  trackCount: {
    type: Number,
    default: 0,
    min: [0, 'Track count cannot be negative']
  },
  duration: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String,
    trim: true
  },
  createdBy: {
    type: String,
    trim: true,
    maxlength: [100, 'Created by cannot be more than 100 characters']
  },
  tracks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track'
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 20; // Maximum 20 tags
      },
      message: 'Cannot have more than 20 tags'
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Pre-save middleware to update trackCount based on tracks array
playlistSchema.pre('save', function(next) {
  if (this.tracks) {
    this.trackCount = this.tracks.length;
  }
  next();
});

// Index for better query performance
playlistSchema.index({ createdBy: 1 });
playlistSchema.index({ isPublic: 1 });
playlistSchema.index({ tags: 1 });
playlistSchema.index({ createdAt: -1 });

const Playlist = mongoose.model('Playlist', playlistSchema);

export default Playlist;