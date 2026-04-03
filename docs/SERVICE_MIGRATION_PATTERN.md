# Service Migration Pattern - TypeORM to MongoDB

## Quick Reference

### Constructor Changes
```typescript
// Before
@InjectRepository(Entity)
private readonly entityRepo: Repository<Entity>

// After
@InjectModel(Entity.name)
private readonly entityModel: Model<EntityDocument>
```

### Common Query Patterns

| TypeORM | MongoDB |
|---------|---------|
| `findOne({ where: { id } })` | `findOne({ id }).exec()` |
| `find({ where: { active: true } })` | `find({ active: true }).exec()` |
| `save(entity)` | `new Model(data).save()` or `Model.create(data)` |
| `update(id, data)` | `findOneAndUpdate({ id }, { $set: data }, { new: true })` |
| `remove(entity)` | `deleteOne({ id })` |
| `count({ where })` | `countDocuments(filter)` |
| `findAndCount({ skip, take })` | `Promise.all([find().skip().limit(), countDocuments()])` |
| `createQueryBuilder().where().andWhere()` | Build filter object, use `find(filter)` |
| `Like('%search%')` | `{ $regex: 'search', $options: 'i' }` |
| `In([...ids])` | `{ $in: [...ids] }` |
| `IsNull()` | `null` or `{ $exists: false }` |

### Creating Documents
```typescript
// Before
const entity = this.repo.create(data);
await this.repo.save(entity);

// After
const entity = await this.model.create({
  id: uuidv4(),
  ...data,
});
```

### Updating Documents
```typescript
// Before
Object.assign(entity, data);
await this.repo.save(entity);

// After
const updated = await this.model.findOneAndUpdate(
  { id },
  { $set: data },
  { new: true }
).exec();
```

### Relations
```typescript
// Before - TypeORM loads relations automatically
const product = await this.repo.findOne({
  where: { id },
  relations: ['variants', 'images']
});

// After - MongoDB requires manual loading
const product = await this.model.findOne({ id }).exec();
const [variants, images] = await Promise.all([
  this.variantModel.find({ productId: id }).exec(),
  this.imageModel.find({ productId: id }).exec(),
]);
(product as any).variants = variants;
(product as any).images = images;
```

