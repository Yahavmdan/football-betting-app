# Railway Deployment Checklist ✅

Use this checklist to ensure a smooth migration from Render to Railway.

---

## Pre-Deployment

- [ ] Have Railway account ready (paid account)
- [ ] Have all environment variables from Render copied
- [ ] MongoDB Atlas is accessible from anywhere (0.0.0.0/0)
- [ ] Code is pushed to GitHub
- [ ] Tested locally with production environment variables

---

## Railway Setup

- [ ] Created new Railway project
- [ ] Connected GitHub repository
- [ ] Set root directory to `backend`
- [ ] Added all environment variables:
  - [ ] NODE_ENV=production
  - [ ] PORT=3000
  - [ ] MONGODB_URI
  - [ ] JWT_SECRET (32+ characters)
  - [ ] JWT_EXPIRE=7d
  - [ ] FOOTBALL_API_KEY
  - [ ] FOOTBALL_API_URL

---

## Deployment

- [ ] Initial deployment completed successfully
- [ ] No build errors in logs
- [ ] Service shows "Active" status
- [ ] Generated Railway domain
- [ ] Copied Railway URL for testing

---

## Testing

Test each endpoint:

- [ ] Health check: `GET /api/test`
  ```bash
  curl https://your-app.up.railway.app/api/test
  ```

- [ ] Register: `POST /api/auth/register`
  ```bash
  curl -X POST https://your-app.up.railway.app/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","email":"test@test.com","password":"Test123!"}'
  ```

- [ ] Login: `POST /api/auth/login`
  ```bash
  curl -X POST https://your-app.up.railway.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"Test123!"}'
  ```

- [ ] Database connection works (check logs)
- [ ] No errors in Railway logs

---

## Frontend Integration

- [ ] Updated frontend API URL (if separate deployment)
- [ ] Frontend can communicate with Railway backend
- [ ] CORS configured correctly
- [ ] All frontend features work:
  - [ ] User registration
  - [ ] User login
  - [ ] Create group
  - [ ] Join group
  - [ ] View matches
  - [ ] Place bets
  - [ ] View leaderboard

---

## Custom Domain (Optional)

- [ ] Generated Railway domain
- [ ] Added custom domain in Railway dashboard
- [ ] Updated DNS CNAME record
- [ ] Waited for DNS propagation
- [ ] SSL certificate issued automatically
- [ ] Tested custom domain works

---

## Production Verification

- [ ] All API endpoints respond correctly
- [ ] Database queries work
- [ ] Authentication works
- [ ] File uploads work (if applicable)
- [ ] Email sending works (if applicable)
- [ ] No memory leaks in Railway metrics
- [ ] Response times acceptable (<500ms)
- [ ] No 5xx errors in logs

---

## Monitoring Setup

- [ ] Checked Railway metrics dashboard
- [ ] Set up log monitoring
- [ ] Configured alerts (if available)
- [ ] Tested rollback procedure
- [ ] Documented Railway project details

---

## Switch from Render

- [ ] Tested Railway thoroughly for 24-48 hours
- [ ] Updated DNS to point to Railway (if using custom domain)
- [ ] Updated frontend environment variables
- [ ] Verified zero downtime during switch
- [ ] Monitored for any issues after switch

---

## Cleanup

- [ ] Kept Render running for 24-48 hours as backup
- [ ] Verified Railway is stable
- [ ] Deleted Render service
- [ ] Updated documentation with new URLs
- [ ] Removed render.yaml from repo (optional)
- [ ] Updated README with Railway instructions

---

## Post-Deployment

- [ ] Railway URL documented for team
- [ ] Environment variables backed up securely
- [ ] Deployment process documented
- [ ] Rollback procedure tested
- [ ] Team notified of migration completion

---

## Railway CLI (Optional)

- [ ] Installed Railway CLI: `npm i -g @railway/cli`
- [ ] Logged in: `railway login`
- [ ] Linked project: `railway link`
- [ ] Tested commands:
  - [ ] `railway logs` (view logs)
  - [ ] `railway status` (check status)
  - [ ] `railway run <command>` (run commands)

---

## Emergency Rollback Plan

If something goes wrong:

1. [ ] DNS: Point back to Render (if using custom domain)
2. [ ] Frontend: Revert API URL to Render
3. [ ] Railway: Check logs for errors
4. [ ] Database: Verify connection string
5. [ ] Contact: Railway support via Discord

---

## Success Criteria

✅ Your deployment is successful when:

- [ ] All health checks pass
- [ ] Users can register and login
- [ ] All CRUD operations work
- [ ] Frontend communicates with backend
- [ ] No errors in logs for 1 hour
- [ ] Response times < 500ms
- [ ] Database queries work correctly
- [ ] Team can access the application

---

**Deployment Date**: _____________

**Deployed By**: _____________

**Railway URL**: _____________

**Notes**: _____________________________________________

---

## Support Resources

- 📚 Railway Docs: https://docs.railway.app
- 💬 Railway Discord: https://discord.gg/railway
- 📊 Railway Status: https://status.railway.app
- 🐛 Report Issues: https://github.com/railwayapp/railway/issues

---

**Happy deploying! 🚂🎉**
