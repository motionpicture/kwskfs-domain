/**
 * レポートサービス
 * 実験的実装中
 * @namespace service.report
 */

import * as HealthService from './report/health';
import * as TelemetryService from './report/telemetry';

export {
    HealthService as health,
    TelemetryService as telemetry
};
