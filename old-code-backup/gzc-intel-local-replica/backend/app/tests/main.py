import sys
import logging
import asyncio
from datetime import datetime
from pathlib import Path
from test_config import TestConfig
from test_framework import run_tests as run_framework_tests
from test_performance import run_performance_tests
from run_tests import generate_test_report

async def main():
    """Main test execution function"""
    start_time = datetime.now()

    # Configure logging
    log_file = TestConfig.LOGS_DIR / f'test_run_{start_time.strftime("%Y%m%d_%H%M%S")}.log'
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )

    logging.info("Starting test execution")
    logging.info(f"Test environment: {TestConfig.get_fix_settings()['host']}")

    try:
        # Run framework tests
        logging.info("\nRunning framework tests...")
        framework_result = await run_framework_tests()

        # Run performance tests
        logging.info("\nRunning performance tests...")
        performance_result = run_performance_tests()

        # Generate consolidated test report
        report_path = TestConfig.REPORTS_DIR / f'test_report_{start_time.strftime("%Y%m%d_%H%M%S")}.html'

        # Combine results
        total_tests = framework_result.testsRun + performance_result.testsRun
        total_failures = len(framework_result.failures) + len(performance_result.failures)
        total_errors = len(framework_result.errors) + len(performance_result.errors)

        # Generate report
        with open(report_path, 'w') as f:
            f.write("""
            <html>
            <head>
                <title>FSS Test Results</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .success { color: green; }
                    .failure { color: red; }
                    .error { color: darkred; }
                    .warning { color: orange; }
                    .section { margin: 20px 0; padding: 10px; border: 1px solid #ccc; }
                    .summary { font-size: 1.2em; margin: 10px 0; }
                    .details { margin-left: 20px; }
                </style>
            </head>
            <body>
            """)

            # Write summary
            f.write("<h1>FSS Test Results</h1>")
            f.write(f"<p>Run Date: {start_time.strftime('%Y-%m-%d %H:%M:%S')}</p>")
            f.write(f"<p>Environment: {TestConfig.get_fix_settings()['host']}</p>")

            f.write("<div class='section'>")
            f.write("<h2>Summary</h2>")
            f.write(f"<p>Total Tests: {total_tests}</p>")
            f.write(f"<p>Total Failures: {total_failures}</p>")
            f.write(f"<p>Total Errors: {total_errors}</p>")
            f.write("</div>")

            # Write framework test results
            f.write("<div class='section'>")
            f.write("<h2>Framework Test Results</h2>")
            f.write(f"<p>Tests Run: {framework_result.testsRun}</p>")
            f.write(f"<p>Failures: {len(framework_result.failures)}</p>")
            f.write(f"<p>Errors: {len(framework_result.errors)}</p>")

            if framework_result.failures:
                f.write("<h3>Failures:</h3>")
                for failure in framework_result.failures:
                    f.write(f"<div class='failure'>{failure[0]}: {failure[1]}</div>")

            if framework_result.errors:
                f.write("<h3>Errors:</h3>")
                for error in framework_result.errors:
                    f.write(f"<div class='error'>{error[0]}: {error[1]}</div>")
            f.write("</div>")

            # Write performance test results
            f.write("<div class='section'>")
            f.write("<h2>Performance Test Results</h2>")
            f.write(f"<p>Tests Run: {performance_result.testsRun}</p>")
            f.write(f"<p>Failures: {len(performance_result.failures)}</p>")
            f.write(f"<p>Errors: {len(performance_result.errors)}</p>")

            if performance_result.failures:
                f.write("<h3>Failures:</h3>")
                for failure in performance_result.failures:
                    f.write(f"<div class='failure'>{failure[0]}: {failure[1]}</div>")

            if performance_result.errors:
                f.write("<h3>Errors:</h3>")
                for error in performance_result.errors:
                    f.write(f"<div class='error'>{error[0]}: {error[1]}</div>")
            f.write("</div>")

            f.write("</body></html>")

        logging.info(f"\nTest execution completed. Report generated: {report_path}")

        # Exit with appropriate status code
        if total_failures > 0 or total_errors > 0:
            sys.exit(1)
        sys.exit(0)

    except Exception as e:
        logging.error(f"Test execution failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())
