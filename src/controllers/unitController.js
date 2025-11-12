import Unit from '../model/unitRepository.js';

const unitController = {
  create: async (req, res) => {
    const { name, abbreviation, type } = req.body;
    try {
      const existingUnit = await Unit.findOne({ name: name.toLowerCase() });
      if (existingUnit) {
        return res.status(400).json({ message: 'Unit with this name already exists' });
      }

      const newUnit = new Unit({
        name: name.toLowerCase(),
        abbreviation,
        type,
      });

      await newUnit.save();
      res.status(201).json({ message: 'Unit created successfully', unit: newUnit });
    } catch (err) {
      console.error('Create unit error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  get: async (req, res) => {
    try {
      const units = await Unit.find();
      res.status(200).json({ units });
    } catch (err) {
      console.error('Get units error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
      const skip = (pageNum - 1) * limitNum;

      const [units, total] = await Promise.all([
        Unit.find().select('-__v').sort({ name: 1 }).skip(skip).limit(limitNum),
        Unit.countDocuments(),
      ]);

      res.status(200).json({
        units,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      console.error('Get all units error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  update: async (req, res) => {
    const { id } = req.params;
    const { name, abbreviation, type } = req.body;
    try {
      const unit = await Unit.findById(id);
      if (!unit) {
        return res.status(404).json({ message: 'Unit not found' });
      }

      if (name && name.toLowerCase() !== unit.name) {
        const duplicate = await Unit.findOne({ name: name.toLowerCase() });
        if (duplicate) {
          return res.status(400).json({ message: 'Unit with this name already exists' });
        }
        unit.name = name.toLowerCase();
      }

      if (abbreviation !== undefined) unit.abbreviation = abbreviation;
      if (type !== undefined) unit.type = type;

      await unit.save();
      res.status(200).json({ message: 'Unit updated successfully', unit });
    } catch (err) {
      console.error('Update unit error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  delete: async (req, res) => {
    const { id } = req.params;
    try {
      const unit = await Unit.findByIdAndDelete(id);
      if (!unit) {
        return res.status(404).json({ message: 'Unit not found' });
      }

      res.status(200).json({ message: 'Unit deleted successfully' });
    } catch (err) {
      console.error('Delete unit error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  deleteMany: async (req, res) => {
    const { ids } = req.body; // Expecting an array of IDs
    try {
      const result = await Unit.deleteMany({ _id: { $in: ids } });
      res.status(200).json({ message: `${result.deletedCount} units deleted successfully` });
    } catch (err) {
      console.error('Delete many units error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

export default unitController;
