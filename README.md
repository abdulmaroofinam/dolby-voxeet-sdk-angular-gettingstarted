# [Dolby](https://dolby.io/) (Previously Voxeet) Angular Demo Application

This project was developed by [Abdul Maroof](https://www.linkedin.com/in/abdulmaroof)  using [Dolby - Built on top of WebRTC](https://dolby.io/developers/interactivity-apis/client-sdk/overview) (Voxeet) SDK for Javascript.


## Steps to Configure Project
Download and install:

    nodejs version 10 
    npm version 6
    WebStorm by Jetbrains
    
Open Project in WebStorm & Run:
    
    npm Install
    
After doing the above steps. Do the following to configure Dolby/Voxeet.

1. Go to Dolby.io 
2. Sign Up
3. Go to Dashboard 
4. Add new app    
5. Copy the Consumer Key & Consumer Secret & replace it with existing keys in app.component.ts file

## Building for development & production
### For Development
Execute following command to run the project on development environment 

    npm run start
 
Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files. 

### For Production
Execute following command to build the project

    npm run build 

The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Further help
To get more help on the Dolby go check out the [SDK](https://dolby.io/developers/interactivity-apis/client-sdk/overview).
