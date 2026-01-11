import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Sale from '../models/Sale';
import Product from '../models/Product';
import Inventory from '../models/Inventory';
import Store from '../models/Store';
import User from '../models/User';
import Supplier from '../models/Supplier';
import PurchaseOrder from '../models/PurchaseOrder';
import Credit from '../models/Credit';
import Transfer from '../models/Transfer';
import CashRegister from '../models/CashRegister';
import Return from '../models/Return';

// Exportar datos completos para backup (solo admin)
export const exportFullBackup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Solo administradores pueden exportar backups' });
      return;
    }

    const { storeId, format = 'json' } = req.query;

    // Filtro opcional por tienda
    const storeFilter = storeId ? { store: storeId } : {};
    const storeFilterAlt = storeId ? { _id: storeId } : {};

    // Recopilar todos los datos
    const [
      stores,
      products,
      inventory,
      sales,
      suppliers,
      purchaseOrders,
      credits,
      transfers,
      cashRegisters,
      returns,
      users,
    ] = await Promise.all([
      Store.find(storeFilterAlt).lean(),
      Product.find().lean(),
      Inventory.find(storeFilter).populate('product', 'name sku').populate('store', 'name').lean(),
      Sale.find(storeFilter).populate('items.product', 'name sku').populate('store', 'name').lean(),
      Supplier.find().lean(),
      PurchaseOrder.find(storeFilter).populate('items.product', 'name sku').lean(),
      Credit.find(storeFilter).lean(),
      Transfer.find().lean(), // Transferencias no tienen un solo store
      CashRegister.find(storeFilter).lean(),
      Return.find(storeFilter).lean(),
      User.find().select('-password').lean(),
    ]);

    const backupData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      storeId: storeId || 'all',
      counts: {
        stores: stores.length,
        products: products.length,
        inventory: inventory.length,
        sales: sales.length,
        suppliers: suppliers.length,
        purchaseOrders: purchaseOrders.length,
        credits: credits.length,
        transfers: transfers.length,
        cashRegisters: cashRegisters.length,
        returns: returns.length,
        users: users.length,
      },
      data: {
        stores,
        products,
        inventory,
        sales,
        suppliers,
        purchaseOrders,
        credits,
        transfers,
        cashRegisters,
        returns,
        users,
      },
    };

    if (format === 'csv') {
      // Generar CSV simplificado de ventas
      const csvData = generateSalesCSV(sales);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=backup-ventas-${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\uFEFF' + csvData); // BOM para Excel
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=backup-completo-${new Date().toISOString().split('T')[0]}.json`);
      res.json(backupData);
    }
  } catch (error) {
    next(error);
  }
};

// Exportar ventas en CSV
export const exportSalesCSV = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId, startDate, endDate } = req.query;
    const userStoreId = req.user!.store;
    const isAdmin = req.user!.role === 'admin';

    const query: Record<string, unknown> = { status: { $ne: 'cancelled' } };

    // Filtro por tienda
    if (storeId) {
      query.store = storeId;
    } else if (!isAdmin && userStoreId) {
      query.store = userStoreId;
    }

    // Filtro por fecha
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        (query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        (query.createdAt as Record<string, Date>).$lte = end;
      }
    }

    const sales = await Sale.find(query)
      .populate('items.product', 'name sku category')
      .populate('store', 'name')
      .populate('soldBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const csvData = generateSalesCSV(sales);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=ventas-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csvData);
  } catch (error) {
    next(error);
  }
};

// Exportar inventario en CSV
export const exportInventoryCSV = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId } = req.query;
    const userStoreId = req.user!.store;
    const isAdmin = req.user!.role === 'admin';

    const query: Record<string, unknown> = {};

    if (storeId) {
      query.store = storeId;
    } else if (!isAdmin && userStoreId) {
      query.store = userStoreId;
    }

    const inventory = await Inventory.find(query)
      .populate('product', 'name sku category price cost')
      .populate('store', 'name')
      .sort({ 'product.name': 1 })
      .lean();

    // Generar CSV
    const headers = ['Tienda', 'SKU', 'Producto', 'Categoría', 'Cantidad', 'Stock Mínimo', 'Precio', 'Costo', 'Valor Total'];
    const rows = inventory.map((inv: any) => [
      inv.store?.name || '',
      inv.product?.sku || '',
      inv.product?.name || '',
      inv.product?.category || '',
      inv.quantity,
      inv.minStock || 0,
      inv.product?.price || 0,
      inv.product?.cost || 0,
      (inv.quantity * (inv.product?.cost || 0)).toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=inventario-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csvContent);
  } catch (error) {
    next(error);
  }
};

// Exportar productos en CSV
export const exportProductsCSV = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    const headers = ['SKU', 'Nombre', 'Categoría', 'Subcategoría', 'Precio', 'Costo', 'Margen %', 'Código Barras'];
    const rows = products.map((p: any) => {
      const margin = p.cost > 0 ? ((p.price - p.cost) / p.cost * 100).toFixed(1) : 0;
      return [
        p.sku || '',
        p.name,
        p.category || '',
        p.subcategory || '',
        p.price,
        p.cost || 0,
        margin,
        p.barcode || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=productos-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csvContent);
  } catch (error) {
    next(error);
  }
};

// Reporte comparativo de tiendas
export const getStoreComparisonReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const dateMatch: Record<string, unknown> = { status: { $ne: 'cancelled' } };
    if (startDate || endDate) {
      dateMatch.createdAt = {};
      if (startDate) {
        (dateMatch.createdAt as Record<string, Date>).$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        (dateMatch.createdAt as Record<string, Date>).$lte = end;
      }
    }

    // Ventas por tienda
    const salesByStore = await Sale.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: '$store',
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgTicket: { $avg: '$total' },
          cashSales: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$total', 0] }
          },
          cardSales: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'card'] }, '$total', 0] }
          },
          transferSales: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'transfer'] }, '$total', 0] }
          },
        },
      },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'store',
        },
      },
      { $unwind: '$store' },
      {
        $project: {
          storeName: '$store.name',
          storeId: '$_id',
          totalSales: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          avgTicket: { $round: ['$avgTicket', 2] },
          cashSales: { $round: ['$cashSales', 2] },
          cardSales: { $round: ['$cardSales', 2] },
          transferSales: { $round: ['$transferSales', 2] },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    // Inventario por tienda
    const inventoryByStore = await Inventory.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productData',
        },
      },
      { $unwind: '$productData' },
      {
        $group: {
          _id: '$store',
          totalProducts: { $sum: 1 },
          totalUnits: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$productData.cost'] } },
          lowStockCount: {
            $sum: { $cond: [{ $lte: ['$quantity', '$minStock'] }, 1, 0] }
          },
          outOfStockCount: {
            $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] }
          },
        },
      },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'store',
        },
      },
      { $unwind: '$store' },
      {
        $project: {
          storeName: '$store.name',
          storeId: '$_id',
          totalProducts: 1,
          totalUnits: 1,
          totalValue: { $round: ['$totalValue', 2] },
          lowStockCount: 1,
          outOfStockCount: 1,
        },
      },
    ]);

    // Combinar datos
    const comparison = salesByStore.map(sales => {
      const inventory = inventoryByStore.find(
        inv => inv.storeId.toString() === sales.storeId.toString()
      );
      return {
        ...sales,
        inventory: inventory || {
          totalProducts: 0,
          totalUnits: 0,
          totalValue: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
        },
      };
    });

    res.json({
      success: true,
      data: comparison,
      period: {
        startDate: startDate || 'all',
        endDate: endDate || 'all',
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper para generar CSV de ventas
function generateSalesCSV(sales: any[]): string {
  const headers = [
    'Fecha',
    'Número Venta',
    'Tienda',
    'Productos',
    'Cantidad Items',
    'Subtotal',
    'Descuento',
    'Total',
    'Método Pago',
    'Vendedor',
    'Estado',
  ];

  const rows = sales.map(sale => {
    const productNames = sale.items
      .map((item: any) => `${item.product?.name || 'N/A'} (${item.quantity})`)
      .join('; ');
    const totalItems = sale.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    return [
      new Date(sale.createdAt).toLocaleString('es-CO'),
      sale.saleNumber || sale._id,
      sale.store?.name || '',
      productNames,
      totalItems,
      sale.total || 0,
      sale.discount || 0,
      sale.finalTotal || sale.total || 0,
      sale.paymentMethod || '',
      sale.soldBy?.name || '',
      sale.status || '',
    ];
  });

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}
