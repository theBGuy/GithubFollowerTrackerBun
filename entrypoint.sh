#!/bin/sh

# Export all env vars to a file that cron jobs can source
printenv > /app/.env.sh
sed -i 's/^\(.*\)=\(.*\)$/export \1="\2"/' /app/.env.sh

# Create the cron job script
cat > /app/run-job.sh << 'SCRIPT'
#!/bin/sh
source /app/.env.sh
cd /app
/usr/local/bin/bun run index.ts >> /proc/1/fd/1 2>&1
SCRIPT
chmod +x /app/run-job.sh

# Create crontab file
echo "${CRON_SCHEDULE:-0 * * * *} /app/run-job.sh" > /etc/crontabs/root

# Run once on startup so you know it works
echo "Running initial job..."
/app/run-job.sh

echo "Starting cron with schedule: ${CRON_SCHEDULE:-0 * * * *}"
# Start crond in foreground
crond -f -l 2
