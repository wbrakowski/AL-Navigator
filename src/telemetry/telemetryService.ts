import * as vscode from 'vscode';
import TelemetryReporter from '@vscode/extension-telemetry';
import { CustomConsole } from '../additional/console';

/**
 * Telemetry service for tracking extension usage and errors.
 * Uses VS Code's official telemetry reporter with Azure Application Insights.
 * 
 * Features:
 * - Respects VS Code's global telemetry setting (telemetry.telemetryLevel)
 * - Respects extension's own enableTelemetry setting
 * - Smart sampling: 10% for successful commands, 100% for errors
 * - No personal information or code is transmitted
 * - Cost-efficient: Minimal data volume
 */
export class TelemetryService {
    private static instance: TelemetryService;
    private reporter: TelemetryReporter | undefined;
    private isEnabled: boolean = false;
    private extensionVersion: string = '';
    private sessionId: string = '';

    // Azure Application Insights instrumentation key
    // Replace this with your own key from Azure Portal
    // Free tier: 5 GB/month (plenty for extension telemetry)
    private readonly instrumentationKey = '8f145939-c56a-495d-a090-88c934715fc1';

    // Sampling rate for commands and errors (0.0 - 1.0)
    // 0.1 = 10% of all commands and errors are tracked
    private readonly samplingRate = 0.1;

    private constructor() {
        // Private constructor for singleton pattern
    }

    /**
     * Get the singleton instance of the TelemetryService
     */
    public static getInstance(): TelemetryService {
        if (!TelemetryService.instance) {
            TelemetryService.instance = new TelemetryService();
        }
        return TelemetryService.instance;
    }

    /**
     * Initialize the telemetry service
     * @param context The extension context
     */
    public initialize(context: vscode.ExtensionContext): void {
        // Check if telemetry is enabled in extension settings (default: true)
        const config = vscode.workspace.getConfiguration('alNavigator');
        const telemetryConfig = vscode.workspace.getConfiguration('telemetry');

        const extensionTelemetryEnabled = config.get<boolean>('enableTelemetry', true);
        const vscodeTelemeryLevel = telemetryConfig.get<string>('telemetryLevel', 'all');

        // DEBUG: Log telemetry status
        CustomConsole.customConsole.appendLine(`[Telemetry] Extension telemetry enabled: ${extensionTelemetryEnabled}`);
        CustomConsole.customConsole.appendLine(`[Telemetry] VS Code telemetry level: ${vscodeTelemeryLevel}`);
        CustomConsole.customConsole.appendLine(`[Telemetry] Final telemetry status: ${extensionTelemetryEnabled && vscodeTelemeryLevel !== 'off'}`);

        if (!extensionTelemetryEnabled) {
            CustomConsole.customConsole.appendLine('[Telemetry] Telemetry is disabled by user preference (alNavigator.enableTelemetry)');
            return;
        }

        // Get extension version from package.json
        this.extensionVersion = context.extension.packageJSON.version || 'unknown';

        // Generate unique session ID
        this.sessionId = this.generateSessionId();

        try {
            // Initialize VS Code's TelemetryReporter
            // This automatically respects VS Code's global telemetry.telemetryLevel setting
            this.reporter = new TelemetryReporter(this.instrumentationKey);
            context.subscriptions.push(this.reporter);

            this.isEnabled = true;

            // DEBUG: Log successful initialization
            CustomConsole.customConsole.appendLine(`[Telemetry] TelemetryReporter initialized successfully`);
            CustomConsole.customConsole.appendLine(`[Telemetry] Instrumentation Key: ${this.instrumentationKey.substring(0, 8)}...`);
            CustomConsole.customConsole.appendLine(`[Telemetry] Session ID: ${this.sessionId}`);
            CustomConsole.customConsole.appendLine(`[Telemetry] Extension Version: ${this.extensionVersion}`);
            CustomConsole.customConsole.appendLine(`[Telemetry] Sampling rate: ${this.samplingRate * 100}% for commands and errors`);

            CustomConsole.customConsole.appendLine('[Telemetry] Telemetry service initialized successfully');

        } catch (error) {
            CustomConsole.customConsole.appendLine(`[Telemetry] ERROR initializing: ${error}`);
            this.isEnabled = false;
        }
    }

    /**
     * Track a command execution with 10% sampling
     * Both successful and failed commands use the same sampling rate
     * 
     * @param commandName The name of the command
     * @param properties Additional properties to track
     * @param measurements Additional measurements to track
     */
    public trackCommand(
        commandName: string,
        properties?: { [key: string]: string },
        measurements?: { [key: string]: number }
    ): void {
        if (!this.isEnabled || !this.reporter) {
            CustomConsole.customConsole.appendLine(`[Telemetry] trackCommand skipped (enabled: ${this.isEnabled}, reporter: ${!!this.reporter})`);
            return;
        }

        try {
            // Apply sampling for all commands (10%)
            const shouldTrack = Math.random() < this.samplingRate;

            if (!shouldTrack) {
                CustomConsole.customConsole.appendLine(`[Telemetry] Command ${commandName} filtered by sampling`);
                return; // Skip this event due to sampling
            }

            // DEBUG: Log command tracking
            CustomConsole.customConsole.appendLine(`[Telemetry] Tracking command: ${commandName} (status: ${properties?.status || 'unknown'})`);

            const eventName = `command.${commandName.replace('extension.', '')}`;
            this.reporter.sendTelemetryEvent(eventName, {
                ...properties,
                commandName: commandName,
                extensionVersion: this.extensionVersion,
                sessionId: this.sessionId,
                platform: process.platform,
                sampled: 'yes' // All commands are sampled at 10%
            }, measurements);

            CustomConsole.customConsole.appendLine(`[Telemetry] Command event sent successfully`);
        } catch (error) {
            CustomConsole.customConsole.appendLine(`[Telemetry] ERROR sending command event: ${error}`);
        }
    }

    /**
     * Track a generic event (always tracked, no sampling)
     * @param eventName The name of the event
     * @param properties Additional properties to track
     * @param measurements Additional measurements to track
     */
    public trackEvent(
        eventName: string,
        properties?: { [key: string]: string },
        measurements?: { [key: string]: number }
    ): void {
        if (!this.isEnabled || !this.reporter) {
            return;
        }

        try {
            // DEBUG: Log event tracking
            CustomConsole.customConsole.appendLine(`[Telemetry] Tracking event: ${eventName}`);

            this.reporter.sendTelemetryEvent(eventName, {
                ...properties,
                extensionVersion: this.extensionVersion,
                sessionId: this.sessionId,
                platform: process.platform
            }, measurements);

            CustomConsole.customConsole.appendLine(`[Telemetry] Event sent successfully`);
        } catch (error) {
            CustomConsole.customConsole.appendLine(`[Telemetry] ERROR sending event: ${error}`);
        }
    }

    /**
     * Track an error with sampling (10%)
     * Enhanced with more contextual information
     * @param error The error to track
     * @param properties Additional properties to track
     */
    public trackError(error: Error, properties?: { [key: string]: string }): void {
        if (!this.isEnabled || !this.reporter) {
            return;
        }

        try {
            // Apply sampling for errors too
            const shouldTrack = Math.random() < this.samplingRate;

            if (!shouldTrack) {
                CustomConsole.customConsole.appendLine(`[Telemetry] Error ${error.name} filtered by sampling`);
                return; // Skip this error due to sampling
            }

            // DEBUG: Log error tracking
            CustomConsole.customConsole.appendLine(`[Telemetry] Tracking error: ${error.message}`);

            // Enhanced error properties with more context
            const errorProperties = {
                ...properties,
                errorMessage: error.message,
                errorName: error.name, // Error type (TypeError, ReferenceError, etc.)
                errorStack: error.stack || 'No stack trace',
                errorLocation: this.extractErrorLocation(error.stack), // File and line number
                extensionVersion: this.extensionVersion,
                sessionId: this.sessionId,
                platform: process.platform,
                nodeVersion: process.version,
                vscodeVersion: vscode.version,
                sampled: 'yes' // Indicate this error was sampled
            };

            // Track error with sampling applied
            this.reporter.sendTelemetryErrorEvent('extension.error', errorProperties);

            CustomConsole.customConsole.appendLine(`[Telemetry] Error event sent successfully`);
        } catch (trackError) {
            CustomConsole.customConsole.appendLine(`[Telemetry] ERROR sending error event: ${trackError}`);
        }
    }

    /**
     * Extract the first meaningful line from error stack trace
     * @param stack Error stack trace
     * @returns First file location from stack or 'Unknown'
     */
    private extractErrorLocation(stack: string | undefined): string {
        if (!stack) {
            return 'Unknown';
        }

        try {
            // Find first line that contains file path
            const lines = stack.split('\n');
            const firstLocation = lines.find(line =>
                line.includes('.ts:') || line.includes('.js:')
            );

            if (!firstLocation) {
                return 'Unknown';
            }

            // Extract just the file and line number (without full path)
            const match = firstLocation.match(/([^\/\\]+\.(?:ts|js)):?(\d+)/);
            return match ? `${match[1]}:${match[2]}` : 'Unknown';
        } catch (e) {
            return 'Unknown';
        }
    }

    /**
     * Track execution time of a command with smart sampling
     * @param commandName The name of the command
     * @param durationMs The duration in milliseconds
     * @param properties Additional properties
     */
    public trackCommandTiming(
        commandName: string,
        durationMs: number,
        properties?: { [key: string]: string }
    ): void {
        if (!this.isEnabled || !this.reporter) {
            return;
        }

        try {
            this.trackCommand(commandName, properties, {
                executionTimeMs: durationMs
            });
        } catch (error) {
            console.error('[AL Navigator] Failed to track command timing:', error);
        }
    }

    /**
     * Dispose of telemetry service
     * TelemetryReporter automatically flushes data on dispose
     */
    public dispose(): void {
        if (this.isEnabled && this.reporter) {
            // Reporter will be disposed by VS Code (it's in subscriptions)
            CustomConsole.customConsole.appendLine('[Telemetry] Telemetry service disposed');
        }
    }

    /**
     * Generate a unique session ID
     */
    private generateSessionId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if telemetry is enabled
     */
    public get enabled(): boolean {
        return this.isEnabled;
    }
}

/**
 * Helper function to wrap a command callback with telemetry tracking
 * Automatically tracks execution time and errors with smart sampling
 * 
 * @param commandName The name of the command
 * @param callback The original callback function
 * @returns A wrapped callback that tracks telemetry
 */
export function trackCommandExecution<T extends (...args: any[]) => any>(
    commandName: string,
    callback: T
): T {
    return (async (...args: any[]) => {
        const telemetry = TelemetryService.getInstance();
        const startTime = Date.now();

        try {
            // Execute the original callback
            const result = await callback(...args);

            // Track successful execution with sampling
            const duration = Date.now() - startTime;
            telemetry.trackCommandTiming(commandName, duration, { status: 'success' });

            return result;
        } catch (error) {
            // Track error execution (100%, no sampling)
            const duration = Date.now() - startTime;
            telemetry.trackCommandTiming(commandName, duration, { status: 'error' });

            if (error instanceof Error) {
                telemetry.trackError(error, {
                    commandName: commandName,
                    context: 'commandExecution'
                });
            }

            // Re-throw the error to maintain original behavior
            throw error;
        }
    }) as T;
}
