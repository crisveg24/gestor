import Sale from '../models/Sale';
import mongoose from 'mongoose';

// Helper para convertir string a ObjectId de forma segura
const toObjectId = (id: string | undefined): mongoose.Types.ObjectId | undefined => {
  if (!id) return undefined;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return undefined;
  }
};

interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  store?: string;
  category?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  limit?: number;
}

export class ReportService {
  async getStats(filters: ReportFilters) {
    const { dateFrom, dateTo, store, category } = filters;

    const matchStage: any = {
      status: { $ne: 'cancelled' },
    };

    if (dateFrom && dateTo) {
      matchStage.createdAt = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo + 'T23:59:59.999Z'),
      };
    }

    if (store) {
      const storeObjectId = toObjectId(store); if (storeObjectId) { matchStage.store = storeObjectId; }
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
    ];

    if (category) {
      pipeline.push({
        $match: {
          'productDetails.category': category,
        },
      });
    }

    pipeline.push({
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        totalProducts: { $sum: { $size: '$items' } },
      },
    });

    const result = await Sale.aggregate(pipeline);

    if (result.length === 0) {
      return {
        totalSales: 0,
        totalRevenue: 0,
        totalProducts: 0,
        averageTicket: 0,
      };
    }

    const stats = result[0];
    return {
      totalSales: stats.totalSales,
      totalRevenue: stats.totalRevenue,
      totalProducts: stats.totalProducts,
      averageTicket: stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0,
    };
  }

  async getSalesTrend(filters: ReportFilters) {
    const { dateFrom, dateTo, store, category, period = 'daily' } = filters;

    const matchStage: any = {
      status: { $ne: 'cancelled' },
    };

    if (dateFrom && dateTo) {
      matchStage.createdAt = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo + 'T23:59:59.999Z'),
      };
    }

    if (store) {
      const storeObjectId = toObjectId(store); if (storeObjectId) { matchStage.store = storeObjectId; }
    }

    const pipeline: any[] = [
      { $match: matchStage },
    ];

    if (category) {
      pipeline.push(
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productDetails',
          },
        },
        {
          $match: {
            'productDetails.category': category,
          },
        }
      );
    }

    let dateFormat: any = {};
    switch (period) {
      case 'daily':
        dateFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        break;
      case 'weekly':
        dateFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        break;
      case 'monthly':
        dateFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;
      case 'yearly':
        dateFormat = {
          year: { $year: '$createdAt' },
        };
        break;
    }

    pipeline.push(
      {
        $group: {
          _id: dateFormat,
          sales: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    );

    const result = await Sale.aggregate(pipeline);

    return result.map((item: any) => {
      let date = '';
      if (item._id.day) {
        date = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
      } else if (item._id.week) {
        date = `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`;
      } else if (item._id.month) {
        date = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      } else {
        date = `${item._id.year}`;
      }

      return {
        date,
        sales: item.sales,
        revenue: item.revenue,
      };
    });
  }

  async getTopProducts(filters: ReportFilters) {
    const { dateFrom, dateTo, store, limit = 10 } = filters;

    const matchStage: any = {
      status: { $ne: 'cancelled' },
    };

    if (dateFrom && dateTo) {
      matchStage.createdAt = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo + 'T23:59:59.999Z'),
      };
    }

    if (store) {
      const storeObjectId = toObjectId(store); if (storeObjectId) { matchStage.store = storeObjectId; }
    }

    const result = await Sale.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          quantity: 1,
          revenue: 1,
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: limit },
    ]);

    return result;
  }

  async getStorePerformance(filters: ReportFilters) {
    const { dateFrom, dateTo } = filters;

    const matchStage: any = {
      status: { $ne: 'cancelled' },
    };

    if (dateFrom && dateTo) {
      matchStage.createdAt = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo + 'T23:59:59.999Z'),
      };
    }

    const result = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$store',
          sales: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'storeDetails',
        },
      },
      { $unwind: '$storeDetails' },
      {
        $project: {
          store: '$storeDetails.name',
          sales: 1,
          revenue: 1,
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    return result;
  }

  async getCategoryData(filters: ReportFilters) {
    const { dateFrom, dateTo, store } = filters;

    const matchStage: any = {
      status: { $ne: 'cancelled' },
    };

    if (dateFrom && dateTo) {
      matchStage.createdAt = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo + 'T23:59:59.999Z'),
      };
    }

    if (store) {
      const storeObjectId = toObjectId(store); if (storeObjectId) { matchStage.store = storeObjectId; }
    }

    const result = await Sale.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          value: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
        },
      },
      {
        $project: {
          name: '$_id',
          value: 1,
          _id: 0,
        },
      },
      { $sort: { value: -1 } },
    ]);

    return result;
  }

  async getPaymentMethodData(filters: ReportFilters) {
    const { dateFrom, dateTo, store } = filters;

    const matchStage: any = {
      status: { $ne: 'cancelled' },
    };

    if (dateFrom && dateTo) {
      matchStage.createdAt = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo + 'T23:59:59.999Z'),
      };
    }

    if (store) {
      const storeObjectId = toObjectId(store); if (storeObjectId) { matchStage.store = storeObjectId; }
    }

    const result = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentMethod',
          value: { $sum: '$total' },
        },
      },
      {
        $project: {
          method: '$_id',
          value: 1,
          _id: 0,
        },
      },
      { $sort: { value: -1 } },
    ]);

    return result;
  }
}
