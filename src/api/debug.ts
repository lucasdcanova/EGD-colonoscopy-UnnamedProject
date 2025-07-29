import { Request, Response, Router } from 'express';
import path from 'path';
import fs from 'fs';

const debugRouter = Router();

// Debug endpoint to check build files
debugRouter.get('/debug/build-info', (req: Request, res: Response) => {
  const rootDir = path.resolve(process.cwd());
  const frontendBuildPath = path.join(rootDir, 'frontend', 'build');
  
  const info = {
    nodeEnv: process.env.NODE_ENV,
    cwd: process.cwd(),
    rootDir: rootDir,
    frontendBuildPath: frontendBuildPath,
    buildExists: fs.existsSync(frontendBuildPath),
    buildContents: [] as string[],
    indexHtmlExists: false,
    staticDirExists: false,
    staticContents: [] as string[],
  };
  
  try {
    if (fs.existsSync(frontendBuildPath)) {
      info.buildContents = fs.readdirSync(frontendBuildPath);
      info.indexHtmlExists = fs.existsSync(path.join(frontendBuildPath, 'index.html'));
      
      const staticPath = path.join(frontendBuildPath, 'static');
      info.staticDirExists = fs.existsSync(staticPath);
      
      if (info.staticDirExists) {
        const staticDirs = fs.readdirSync(staticPath);
        staticDirs.forEach(dir => {
          const dirPath = path.join(staticPath, dir);
          if (fs.statSync(dirPath).isDirectory()) {
            const files = fs.readdirSync(dirPath);
            info.staticContents.push(`${dir}: ${files.join(', ')}`);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error reading build directory:', error);
  }
  
  res.json(info);
});

export default debugRouter;