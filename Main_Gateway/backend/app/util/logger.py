import logging
import logging.config
import configparser
import os
import ast


def configure_logging():
    log_cfg_path = os.getenv("LOG_CONFIG", "log.cfg")
    config = configparser.ConfigParser()
    config.read(log_cfg_path)

    # Safely parse file paths from handler definitions
    try:
        for section in config.sections():
            if section.startswith("handler_"):
                handler_class = config[section].get("class", "")
                args_str = config[section].get("args", "")

                if "FileHandler" in handler_class and args_str:
                    try:
                        # Parse the args tuple from the string
                        args = ast.literal_eval(args_str)
                        if isinstance(args, tuple) and args:
                            file_path = args[0]
                            log_dir = os.path.dirname(file_path)
                            if log_dir and not os.path.exists(log_dir):
                                os.makedirs(log_dir)
                                print(
                                    f"Created logs directory: {log_dir}"
                                )
                    except Exception as e:
                        print(
                            f"Could not parse file handler args in {section}: {e}"
                        )

    except Exception as e:
        print(f"General error preparing log file path: {e}")

    # Apply the logging config
    logging.config.fileConfig(
        log_cfg_path, disable_existing_loggers=False
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
