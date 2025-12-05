// src/common/interceptors/performance-monitor.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
/* 收集记录 */
import { SystemMonitorService } from '@/admin/common/modules/services/system-monitor.service';
/* 收集记录 */
import { BusinessMetricsService } from '@/admin/common/modules/services/business-metrics.service';

@Injectable()
export class PerformanceMonitorInterceptor implements NestInterceptor {
  constructor(
    private readonly systemMonitor: SystemMonitorService,
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap({
        next: () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          const success = response.statusCode < 400;

          // 记录系统指标
          this.systemMonitor.recordRequest(success, responseTime);

          // 记录业务指标
          this.recordBusinessMetrics(request, success, responseTime);
        },
        error: (error) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          // 记录失败的请求
          this.systemMonitor.recordRequest(false, responseTime);

          // 记录业务指标
          this.recordBusinessMetrics(request, false, responseTime);
        },
      }),
    );
  }

  /**
   * 记录业务指标
   */
  private recordBusinessMetrics(
    request: any,
    success: boolean,
    responseTime: number,
  ): void {
    try {
      const { method, url, route } = request;

      // 根据路由记录不同的业务指标
      if (route?.path === '/auth/login' && method === 'POST') {
        this.businessMetrics.recordUserLogin(success);
      } else if (route?.path === '/auth/register' && method === 'POST') {
        this.businessMetrics.recordUserRegistration();
      }

      // 记录安全事件
      if (!success && responseTime > 5000) {
        this.businessMetrics.recordSecurityEvent('slow_response');
      }
    } catch (error) {
      // 静默处理错误，避免影响主流程
    }
  }
}
