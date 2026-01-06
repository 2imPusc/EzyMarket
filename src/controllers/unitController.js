import Unit from '../model/unitRepository.js';
import mongoose from 'mongoose';

const unitController = {
  // Create new unit
  create: async (req, res) => {
    const { name, abbreviation, type } = req.body;
    try {
      const existingUnit = await Unit.findOne({ name: name.toLowerCase().trim() });
      if (existingUnit) {
        return res.status(400).json({ message: 'Unit with this name already exists' });
      }

      const newUnit = new Unit({
        name: name.toLowerCase().trim(),
        abbreviation: abbreviation.trim(),
        type,
      });

      await newUnit.save();
      res.status(201).json({
        message: 'Unit created successfully',
        unit: newUnit,
      });
    } catch (err) {
      console.error('Create unit error:', err);
      if (err.code === 11000) {
        return res.status(400).json({ message: 'Unit with this name already exists' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get all units with pagination
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

  // Get single unit by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const unit = await Unit.findById(id).select('-__v');
      if (!unit) {
        return res.status(404).json({ message: 'Unit not found' });
      }

      res.status(200).json({ unit });
    } catch (err) {
      console.error('Get unit by ID error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Search units with filters
  search: async (req, res) => {
    try {
      const { q = '', type, page = 1, limit = 20, sort = 'name' } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
      const skip = (pageNum - 1) * limitNum;

      const queryText = (q || '').trim();

      // Helper to escape regex special chars
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // If no query text, fallback to normal find with optional type filter and sorting
      if (!queryText) {
        const validSorts = ['name', '-name', 'type', '-type', 'createdAt', '-createdAt'];
        let sortOption = {};
        if (validSorts.includes(sort)) {
          if (sort.startsWith('-')) sortOption[sort.substring(1)] = -1;
          else sortOption[sort] = 1;
        } else {
          sortOption = { name: 1 };
        }

        const baseQuery = type ? { type } : {};
        const [units, total] = await Promise.all([
          Unit.find(baseQuery).select('-__v').sort(sortOption).skip(skip).limit(limitNum),
          Unit.countDocuments(baseQuery),
        ]);

        return res.status(200).json({
          units,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
          },
          filters: {
            q: '',
            type: type || 'all',
            sort,
          },
        });
      }

      // Build aggregation: match contains on name or abbreviation, add 'starts' flag for startsWith priority
      const esc = escapeRegex(queryText);
      const containsPattern = esc;
      const startsPattern = '^' + esc;

      // Build match stage with optional type filter
      const orMatch = [
        { name: { $regex: containsPattern, $options: 'i' } },
        { abbreviation: { $regex: containsPattern, $options: 'i' } },
      ];
      const matchStage = type ? { $match: { $and: [{ $or: orMatch }, { type }] } } : { $match: { $or: orMatch } };

      const addFieldsStage = {
        $addFields: {
          starts: {
            $cond: [
              {
                $or: [
                  { $regexMatch: { input: '$name', regex: startsPattern, options: 'i' } },
                  { $regexMatch: { input: '$abbreviation', regex: startsPattern, options: 'i' } },
                ],
              },
              1,
              0,
            ],
          },
        },
      };

      // Sort: prioritize starts (desc), then by name asc
      const pipelineResults = [
        matchStage,
        addFieldsStage,
        { $sort: { starts: -1, name: 1 } },
        { $project: { __v: 0 } },
        { $skip: skip },
        { $limit: limitNum },
      ];

      const pipelineCount = [matchStage, { $count: 'count' }];

      const agg = await Unit.aggregate([
        {
          $facet: {
            results: pipelineResults,
            totalCount: pipelineCount,
          },
        },
      ]);

      const results = (agg[0] && agg[0].results) || [];
      const total = (agg[0] && agg[0].totalCount && agg[0].totalCount[0] && agg[0].totalCount[0].count) || 0;

      res.status(200).json({
        units: results,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
        filters: {
          q: queryText,
          type: type || 'all',
          sort,
        },
      });
    } catch (err) {
      console.error('Search units error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get units by type
  getByType: async (req, res) => {
    try {
      const { type } = req.params;

      const validTypes = ['weight', 'volume', 'count', 'length', 'area', 'other'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        });
      }

      const units = await Unit.find({ type }).select('-__v').sort({ name: 1 });

      res.status(200).json({
        type,
        count: units.length,
        units,
      });
    } catch (err) {
      console.error('Get units by type error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Update unit
  update: async (req, res) => {
    const { id } = req.params;
    const { name, abbreviation, type } = req.body;

    try {
      const unit = await Unit.findById(id);
      if (!unit) {
        return res.status(404).json({ message: 'Unit not found' });
      }

      // Check duplicate name if name is being changed
      if (name && name.toLowerCase().trim() !== unit.name) {
        const duplicate = await Unit.findOne({ name: name.toLowerCase().trim() });
        if (duplicate) {
          return res.status(400).json({ message: 'Unit with this name already exists' });
        }
        unit.name = name.toLowerCase().trim();
      }

      if (abbreviation !== undefined) unit.abbreviation = abbreviation.trim();
      if (type !== undefined) unit.type = type;

      await unit.save();
      res.status(200).json({
        message: 'Unit updated successfully',
        unit,
      });
    } catch (err) {
      console.error('Update unit error:', err);
      if (err.code === 11000) {
        return res.status(400).json({ message: 'Unit with this name already exists' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Delete single unit
  delete: async (req, res) => {
    const { id } = req.params;
    try {
      const unit = await Unit.findByIdAndDelete(id);
      if (!unit) {
        return res.status(404).json({ message: 'Unit not found' });
      }

      res.status(200).json({
        message: 'Unit deleted successfully',
        unit,
      });
    } catch (err) {
      console.error('Delete unit error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Delete multiple units
  deleteMany: async (req, res) => {
    const { ids } = req.body;
    try {
      const result = await Unit.deleteMany({ _id: { $in: ids } });

      res.status(200).json({
        message: `${result.deletedCount} units deleted successfully`,
        deletedCount: result.deletedCount,
      });
    } catch (err) {
      console.error('Delete many units error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get statistics
  getStats: async (req, res) => {
    try {
      const [total, byType] = await Promise.all([
        Unit.countDocuments(),
        Unit.aggregate([
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]),
      ]);

      const typeStats = {};
      byType.forEach((item) => {
        typeStats[item._id] = item.count;
      });

      res.status(200).json({
        total,
        byType: typeStats,
      });
    } catch (err) {
      console.error('Get unit stats error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

export default unitController;
