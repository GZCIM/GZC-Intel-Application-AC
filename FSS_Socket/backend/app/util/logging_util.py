import logging
import logging.config
import os
import configparser
import sys  # Import sys to handle sys.stdout


def setup_logging(config_file="log.cfg"):
    """
    Set up logging configuration from a configuration file and ensure log directory exists for [handler_file].
    """
    # Parse the log configuration to check for [handler_file]
    if os.path.exists(config_file):
        config = configparser.ConfigParser()
        config.read(config_file)

        if "handler_file" in config.sections():
            # Extract the args for the file handler
            args_line = config["handler_file"].get("args", None)
            if args_line:
                try:
                    # Safely evaluate the args (sys module is already imported)
                    args = eval(
                        args_line,
                        {"sys": sys, "__builtins__": None},
                        {},
                    )
                    if isinstance(args, tuple) and len(args) > 0:
                        log_path = args[0]  # Get the log file path
                        log_dir = os.path.dirname(log_path)

                        # Ensure the log directory exists
                        if log_dir and not os.path.exists(log_dir):
                            os.makedirs(log_dir)
                            print(
                                f"Created logs directory at: {log_dir}"
                            )
                except Exception as e:
                    print(
                        f"Error parsing args in [handler_file]: {args_line}. Error: {e}"
                    )

        # Load the logging configuration
        logging.config.fileConfig(config_file)
        logging.info("Logging initialized from configuration file.")
    else:
        # Fallback to basic configuration
        logging.basicConfig(level=logging.INFO)
        logging.warning(
            f"Logging configuration file '{config_file}' not found. Using basic configuration."
        )
