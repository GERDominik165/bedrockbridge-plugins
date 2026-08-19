#!/bin/bash
# Deployt + AKTIVIERT ein Plugin in der Dev-Sandbox. Usage: deploy.sh <plugin.js>
BP=/opt/bds-dev/development_behavior_packs/Bedrock-Bridge_v1.6.11_b17755d2-3cc0-424b-89dd-558fc98513f5/scripts/bridgePlugins
[ -z "$1" ] && { echo "Usage: deploy.sh <plugin.js>"; exit 1; }
name=$(basename "${1%.js}")
cp "$1" "$BP/" && echo "✓ $name.js → bridgePlugins/"
grep -q "\"./$name\"" "$BP/index.js" || echo "import \"./$name\"" >> "$BP/index.js"
echo "✓ in index.js aktiviert"
systemctl restart bds-dev && sleep 12
journalctl -u bds-dev --no-pager -n 25 | grep -iE "\[$name\]|Loaded.*plugins|Failed:|error" | tail -4
