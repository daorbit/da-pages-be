import mongoose from 'mongoose';
import slugify from 'slugify';

const pageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true
  },
  thumbnailUrl: {
    type: String,
    required: [true, 'Thumbnail URL is required'],
    trim: true
  },
  groups: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 10; // Maximum 10 groups
      },
      message: 'Cannot have more than 10 groups'
    }
  },
  editorType: {
    type: String,
    required: [true, 'Editor type is required'],
    enum: {
      values: ['quill', 'summernote'],
      message: 'Editor type must be either quill or summernote'
    }
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Slug cannot be more than 100 characters']
  },
  content: {
    type: String,
    default: ''
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Pre-save middleware to generate slug from title if not provided
pageSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  next();
});

// Ensure slug is always lowercase and properly formatted
pageSchema.pre('save', function(next) {
  if (this.slug) {
    this.slug = slugify(this.slug, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  next();
});

// Index for better query performance
// Note: slug index is already created by 'unique: true' in schema
pageSchema.index({ groups: 1 });
pageSchema.index({ createdAt: -1 });

const Page = mongoose.model('Page', pageSchema);

export default Page;