#!/usr/bin/env python3
"""
MCProfile Configuration Generator
@version 2.0.0

Generates optimized configuration files for MCProfile plugin
"""

import json
import sys
from pathlib import Path

class ConfigGenerator:
    """Generate MCProfile configuration"""

    @staticmethod
    def generate_default() -> dict:
        """Generate default configuration"""
        return {
            "api": {
                "endpoint": "https://api.mcprofile.io",
                "timeout": 10000,
                "retries": 3,
                "enabled": True
            },
            "cache": {
                "enabled": True,
                "ttl": 3600,
                "maxSize": 1000,
                "cleanupOnLeave": True,
                "cleanupInterval": 300000
            },
            "admin": {
                "tags": ["admin", "operator", "owner"],
                "showProfileOnJoin": True,
                "notifyAdminsOnJoin": True,
                "logProfileAccess": True
            },
            "ui": {
                "enabled": True,
                "showOnJoin": True,
                "useActionForm": True,
                "useModalForm": False,
                "theme": "default"
            },
            "logging": {
                "enabled": True,
                "level": "info",
                "maxHistory": 1000,
                "enableConsole": True,
                "enableFile": False
            },
            "server": {
                "name": "MCProfile Server",
                "version": "2.0.0",
                "maxPlayers": 10,
                "motd": "MCProfile Enabled Server"
            },
            "features": {
                "enableJoinNotifications": True,
                "enableLeaveNotifications": False,
                "enableProfileCaching": True,
                "enableCommandLogging": True,
                "enableAnalytics": False
            },
            "security": {
                "requireAdminTag": True,
                "enforceSSL": True,
                "validateResponses": True,
                "rateLimit": 100
            }
        }

    @staticmethod
    def generate_production() -> dict:
        """Generate production configuration"""
        config = ConfigGenerator.generate_default()

        # Production optimizations
        config["cache"]["ttl"] = 7200
        config["cache"]["maxSize"] = 5000
        config["logging"]["level"] = "warn"
        config["logging"]["maxHistory"] = 5000
        config["api"]["retries"] = 5
        config["security"]["rateLimit"] = 1000

        return config

    @staticmethod
    def generate_development() -> dict:
        """Generate development configuration"""
        config = ConfigGenerator.generate_default()

        # Development optimizations
        config["cache"]["ttl"] = 300  # 5 minutes
        config["logging"]["level"] = "debug"
        config["logging"]["enableFile"] = True
        config["features"]["enableAnalytics"] = True

        return config

    @staticmethod
    def generate_high_performance() -> dict:
        """Generate high-performance configuration"""
        config = ConfigGenerator.generate_default()

        # High-performance optimizations
        config["cache"]["ttl"] = 10800  # 3 hours
        config["cache"]["maxSize"] = 10000
        config["api"]["timeout"] = 5000
        config["api"]["retries"] = 2
        config["logging"]["level"] = "error"
        config["logging"]["maxHistory"] = 100

        return config

    @staticmethod
    def save_config(config: dict, filepath: str) -> bool:
        """Save configuration to file"""
        try:
            path = Path(filepath)
            path.parent.mkdir(parents=True, exist_ok=True)

            with open(path, 'w') as f:
                json.dump(config, f, indent=2)

            print(f"✓ Configuration saved to {filepath}")
            return True

        except Exception as e:
            print(f"✗ Error saving configuration: {e}")
            return False

    @staticmethod
    def validate_config(config: dict) -> tuple:
        """Validate configuration"""
        errors = []

        # Check required fields
        required_sections = ['api', 'cache', 'admin', 'ui', 'logging']
        for section in required_sections:
            if section not in config:
                errors.append(f"Missing section: {section}")

        # Validate API config
        if config.get('api'):
            if not config['api'].get('endpoint'):
                errors.append("Missing api.endpoint")
            if config['api'].get('timeout', 0) <= 0:
                errors.append("api.timeout must be > 0")

        # Validate cache config
        if config.get('cache'):
            if config['cache'].get('ttl', 0) <= 0:
                errors.append("cache.ttl must be > 0")
            if config['cache'].get('maxSize', 0) <= 0:
                errors.append("cache.maxSize must be > 0")

        # Validate logging config
        if config.get('logging'):
            valid_levels = ['error', 'warn', 'info', 'debug', 'trace']
            if config['logging'].get('level') not in valid_levels:
                errors.append(f"Invalid logging.level: {config['logging'].get('level')}")

        return len(errors) == 0, errors

    @staticmethod
    def merge_configs(base: dict, override: dict) -> dict:
        """Merge two configurations"""
        result = json.loads(json.dumps(base))  # Deep copy

        for key, value in override.items():
            if isinstance(value, dict) and key in result:
                result[key] = ConfigGenerator.merge_configs(result[key], value)
            else:
                result[key] = value

        return result

    @staticmethod
    def print_config(config: dict, indent: int = 0) -> None:
        """Pretty print configuration"""
        for key, value in config.items():
            if isinstance(value, dict):
                print("  " * indent + f"{key}:")
                ConfigGenerator.print_config(value, indent + 1)
            else:
                print("  " * indent + f"{key}: {value}")

def main():
    """Main function"""
    print("\n" + "=" * 60)
    print("MCProfile Configuration Generator v2.0.0")
    print("=" * 60)

    if len(sys.argv) > 1:
        profile = sys.argv[1].lower()
    else:
        profile = "default"

    # Generate configuration
    if profile == "production":
        print("\n[Generating Production Configuration]")
        config = ConfigGenerator.generate_production()
    elif profile == "development":
        print("\n[Generating Development Configuration]")
        config = ConfigGenerator.generate_development()
    elif profile == "high-performance":
        print("\n[Generating High-Performance Configuration]")
        config = ConfigGenerator.generate_high_performance()
    else:
        print("\n[Generating Default Configuration]")
        config = ConfigGenerator.generate_default()

    # Validate configuration
    print("\n[Validating Configuration]")
    valid, errors = ConfigGenerator.validate_config(config)

    if valid:
        print("✓ Configuration is valid")
    else:
        print("✗ Configuration validation failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    # Print configuration
    print("\n[Configuration Details]")
    ConfigGenerator.print_config(config)

    # Save configuration
    print("\n[Saving Configuration]")
    output_path = f"config/settings-{profile}.json"
    ConfigGenerator.save_config(config, output_path)

    # Also save to default location
    ConfigGenerator.save_config(config, "config/settings.json")

    print("\n✓ Configuration generation complete")
    return 0

if __name__ == "__main__":
    sys.exit(main())
