import { Request, Response } from 'express';
import { ReportService } from '../services/reportService';

const reportService = new ReportService();

export const getReportStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, store, category } = req.query;
    
    const stats = await reportService.getStats({
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      store: store as string,
      category: category as string,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener estadísticas',
    });
  }
};

export const getSalesTrend = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, store, category, period } = req.query;
    
    const trend = await reportService.getSalesTrend({
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      store: store as string,
      category: category as string,
      period: (period as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'daily',
    });

    res.json({
      success: true,
      data: trend,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener tendencia de ventas',
    });
  }
};

export const getTopProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, store, limit } = req.query;
    
    const topProducts = await reportService.getTopProducts({
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      store: store as string,
      limit: limit ? parseInt(limit as string) : 10,
    });

    res.json({
      success: true,
      data: topProducts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener productos más vendidos',
    });
  }
};

export const getReportsByStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const storePerformance = await reportService.getStorePerformance({
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });

    res.json({
      success: true,
      data: storePerformance,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener rendimiento por tienda',
    });
  }
};

export const getReportsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, store } = req.query;
    
    const categoryData = await reportService.getCategoryData({
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      store: store as string,
    });

    res.json({
      success: true,
      data: categoryData,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener datos por categoría',
    });
  }
};

export const getReportsByPaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, store } = req.query;
    
    const paymentData = await reportService.getPaymentMethodData({
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      store: store as string,
    });

    res.json({
      success: true,
      data: paymentData,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener datos por método de pago',
    });
  }
};
