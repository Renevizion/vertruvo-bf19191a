# Kiruvo App Store Publishing Guide
## For Users Without Xcode/Modern Mac

Since you can't run Xcode locally, you'll use **cloud build services** to compile and sign your iOS app. This guide uses **Codemagic** (free tier available, no Mac needed).

---

## Prerequisites Checklist
- [x] Apple Developer Account ($99/year) - ✅ Done!
- [ ] GitHub account (free)
- [ ] Codemagic account (free tier available)
- [ ] App icons (1024x1024 PNG)
- [ ] Screenshots for App Store (can create with browser dev tools or online mockup tools)
- [ ] Privacy Policy URL: https://kiruvo.com/privacy ✅

---

## Part 1: Export Project to GitHub

### Step 1: Connect Lovable to GitHub

1. In Lovable, go to **Settings → GitHub**
2. Click **"Connect to GitHub"**
3. Authorize Lovable
4. Click **"Create Repository"**
5. Name it `kiruvo-app` (or similar)

Your code is now on GitHub and stays in sync with Lovable automatically.

---

## Part 2: Add Capacitor Configuration

Ask me (in Lovable chat) to add Capacitor to your project. Just say:

> "Add Capacitor iOS configuration to my project for App Store deployment"

I'll add:
- `@capacitor/core`
- `@capacitor/cli`
- `@capacitor/ios`
- `capacitor.config.ts`
- Required iOS configurations

---

## Part 3: Set Up Codemagic (Cloud Build Service)

### Step 1: Create Codemagic Account

1. Go to [codemagic.io](https://codemagic.io)
2. Sign up with your GitHub account
3. It will ask to access your repositories - allow it

### Step 2: Add Your Repository

1. Click **"Add application"**
2. Select **GitHub** as the repository source
3. Find and select your `kiruvo-app` repository
4. Select **"Capacitor"** as the project type

---

## Part 4: Create Apple Certificates & Profiles

You need to create these in your Apple Developer account. Codemagic will use them to sign your app.

### Step 1: Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Click **"Certificates, Identifiers & Profiles"**
3. Click **"Identifiers"** → **"+"**
4. Select **"App IDs"** → **"App"**
5. Fill in:
   - **Description**: Kiruvo
   - **Bundle ID**: Explicit → `com.kiruvo.app`
6. Scroll down, enable any capabilities you need (Push Notifications, etc.)
7. Click **"Continue"** → **"Register"**

### Step 2: Create Distribution Certificate

1. In Apple Developer Portal, go to **"Certificates"** → **"+"**
2. Select **"Apple Distribution"**
3. Click **"Continue"**

Now you need to create a Certificate Signing Request (CSR). Since you don't have a Mac, use this workaround:

#### Option A: Use Codemagic's Automatic Code Signing (Recommended)

Codemagic can manage certificates for you:

1. In Codemagic, go to **Teams** → **Your Team** → **Code signing identities**
2. Click **"Generate new certificate"**
3. Upload your Apple API Key (see next section)
4. Codemagic creates certificates automatically

#### Option B: Create API Key for App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **"Users and Access"** → **"Integrations"** → **"App Store Connect API"**
3. Click **"+"** to create a new key
4. **Name**: Codemagic
5. **Access**: Admin (or App Manager)
6. Click **"Generate"**
7. **Download the .p8 file immediately** (you can only download once!)
8. Note down:
   - **Issuer ID** (shown at top of page)
   - **Key ID** (shown in the key list)

---

## Part 5: Configure Codemagic Build

### Step 1: Add Apple Credentials to Codemagic

1. In Codemagic, go to your app → **Settings**
2. Scroll to **"Distribution"** → **"iOS code signing"**
3. Select **"Automatic"** code signing
4. Click **"Connect to App Store Connect"**
5. Enter:
   - **Issuer ID**: (from App Store Connect API page)
   - **Key ID**: (from App Store Connect API page)
   - **API Key**: Upload the .p8 file you downloaded
6. Click **"Save"**

### Step 2: Configure Build Settings

In Codemagic, add a `codemagic.yaml` file to your repo (I can help with this). Key settings:

```yaml
workflows:
  ios-workflow:
    name: iOS Build
    max_build_duration: 60
    instance_type: mac_mini_m2
    
    environment:
      ios_signing:
        distribution_type: app_store
        bundle_identifier: com.kiruvo.app
      vars:
        BUNDLE_ID: "com.kiruvo.app"
        APP_NAME: "Kiruvo"
      node: 18
    
    scripts:
      - name: Install dependencies
        script: npm install
      
      - name: Build web app
        script: npm run build
      
      - name: Add iOS platform
        script: npx cap add ios || true
      
      - name: Sync Capacitor
        script: npx cap sync ios
      
      - name: Set up code signing
        script: xcode-project use-profiles
      
      - name: Build iOS app
        script: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -archivePath build/App.xcarchive \
            archive
      
      - name: Export IPA
        script: |
          cd ios/App
          xcodebuild -exportArchive \
            -archivePath build/App.xcarchive \
            -exportPath build/export \
            -exportOptionsPlist exportOptions.plist

    artifacts:
      - ios/App/build/export/*.ipa
    
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true
```

### Step 3: Add App Icon

Create a 1024x1024 PNG app icon and add it to your project. You can:
- Use [Canva](https://canva.com) to design it
- Use an AI image generator
- Hire someone on Fiverr

Ask me to add the icon configuration once you have your icon file.

---

## Part 6: Create App Store Listing

### Step 1: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platforms**: iOS
   - **Name**: Kiruvo
   - **Primary Language**: English
   - **Bundle ID**: com.kiruvo.app
   - **SKU**: kiruvo-001
4. Click **"Create"**

### Step 2: Fill Required Information

#### App Information Tab
- **Category**: Business
- **Content Rights**: Check the box confirming you own the rights

#### Pricing and Availability
- Select countries where you want to sell
- Set price (Free or paid)

#### App Privacy
- **Privacy Policy URL**: `https://kiruvo.com/privacy`
- Complete the privacy questionnaire about data collection

#### Version Information (Main Tab)
- **Screenshots**: Upload for at least 6.7" and 5.5" displays
- **Description**: Write your app description
- **Keywords**: CRM, leads, sales, automation, business
- **Support URL**: `https://kiruvo.com`
- **What's New**: "Initial release"

### Step 3: Create Screenshots (Without a Device)

Since you're limited on devices, create screenshots using:

1. **Browser Method**:
   - Open your app in Chrome
   - Press F12 → Toggle device toolbar
   - Select iPhone dimensions (e.g., 430×932 for 6.7")
   - Take screenshots

2. **Mockup Tools** (easier):
   - [shots.so](https://shots.so) - Add device frames
   - [mockuphone.com](https://mockuphone.com) - Free device mockups
   - [previewed.app](https://previewed.app) - Professional mockups

Required screenshot sizes:
| Display Size | Resolution |
|--------------|------------|
| 6.7" | 1290 × 2796 |
| 6.5" | 1284 × 2778 |
| 5.5" | 1242 × 2208 |

---

## Part 7: Build and Submit

### Step 1: Trigger Build in Codemagic

1. Go to Codemagic → Your App
2. Click **"Start new build"**
3. Select `main` branch
4. Select `ios-workflow`
5. Click **"Start new build"**

Build takes ~15-30 minutes. Codemagic will:
- Build your app
- Sign it with your certificates
- Upload to TestFlight automatically

### Step 2: Test on TestFlight

1. Download **TestFlight** app on your iOS 18 phone
2. Your build will appear after processing (~10-30 min)
3. Install and test thoroughly

### Step 3: Submit for Review

1. Go to App Store Connect → Your App
2. In version page, click **"+"** next to Build
3. Select your uploaded build
4. Fill in **"Export Compliance"** (usually "No" for standard apps)
5. Click **"Submit for Review"**

---

## Part 8: After Approval

### Timeline
- First review: 24-48 hours (up to 7 days)
- Subsequent updates: Usually 24 hours

### Updating Your App

1. Make changes in Lovable (auto-syncs to GitHub)
2. Go to Codemagic → Start new build
3. Wait for build + TestFlight processing
4. Test on TestFlight
5. In App Store Connect: Create new version, add build, submit

---

## Quick Reference: What Goes Where

| Task | Where |
|------|-------|
| Edit app code | Lovable |
| View/manage code | GitHub |
| Build iOS app | Codemagic |
| Create certificates | Apple Developer Portal |
| Upload screenshots, submit | App Store Connect |
| Test before release | TestFlight app |

---

## Cost Summary

| Service | Cost |
|---------|------|
| Apple Developer | $99/year ✅ Done |
| Codemagic | Free tier: 500 build min/month |
| GitHub | Free |
| Lovable | Your current plan |

---

## Building Future Apps for App Store

### From Day 1 in Lovable:

1. **Design mobile-first**
   - Use the mobile preview toggle constantly
   - Avoid hover-only interactions
   - Make tap targets at least 44×44px

2. **Set up early**
   - Add Capacitor configuration from start
   - Create App ID in Apple Developer Portal
   - Set up Codemagic pipeline

3. **Test regularly**
   - Build to TestFlight weekly during development
   - Test on your iOS 18 device

4. **Prepare assets early**
   - Design 1024×1024 app icon
   - Plan App Store screenshots
   - Write description and keywords

---

## Need Help?

Just ask me in Lovable to:
- "Add Capacitor iOS configuration"
- "Add the codemagic.yaml build file"
- "Configure app icon for iOS"
- "Make this component mobile-friendly"

I'll make the code changes needed!

---

## Useful Links

- [Codemagic Capacitor Guide](https://docs.codemagic.io/yaml-quick-start/building-a-capacitor-app/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
