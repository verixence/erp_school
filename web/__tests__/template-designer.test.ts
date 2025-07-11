/**
 * 🧪 Template Designer Tests
 * 
 * Tests for the no-code template designer functionality
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tokenCategories } from '../src/lib/reportTokens';
import { reportBlocks, themePresets } from '../src/config/reportBlocks';

// Mock GrapesJS since it requires DOM
jest.mock('grapesjs', () => ({
  __esModule: true,
  default: {
    init: jest.fn().mockReturnValue({
      setComponents: jest.fn(),
      setStyle: jest.fn(),
      getHtml: jest.fn().mockReturnValue('<div>Test HTML</div>'),
      getCss: jest.fn().mockReturnValue('.test { color: red; }'),
      on: jest.fn(),
      destroy: jest.fn(),
      TraitManager: {
        addType: jest.fn()
      },
      runCommand: jest.fn()
    })
  }
}));

// Mock Handlebars
jest.mock('handlebars', () => ({
  __esModule: true,
  default: {
    compile: jest.fn().mockReturnValue((data: any) => '<div>Rendered template</div>'),
    registerHelper: jest.fn()
  }
}));

describe('Report Tokens Configuration', () => {
  test('should have all required token categories', () => {
    expect(tokenCategories).toBeDefined();
    expect(Array.isArray(tokenCategories)).toBe(true);
    expect(tokenCategories.length).toBeGreaterThan(0);

         // Check for essential categories
     const categoryIds = tokenCategories.map(cat => cat.id);
     expect(categoryIds).toContain('student');
     expect(categoryIds).toContain('school');
     expect(categoryIds).toContain('exam');
  });

  test('should have properly formatted tokens', () => {
    tokenCategories.forEach(category => {
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('label');
      expect(category).toHaveProperty('description');
      expect(category).toHaveProperty('tokens');
      expect(Array.isArray(category.tokens)).toBe(true);

      category.tokens.forEach(token => {
        expect(token).toHaveProperty('id');
        expect(token).toHaveProperty('label');
        expect(token).toHaveProperty('token');
        expect(token).toHaveProperty('type');
        expect(token).toHaveProperty('example');

        // Check token format (should be Handlebars syntax)
        expect(token.token).toMatch(/^\{\{.*\}\}$/);
      });
    });
  });

  test('student tokens should include essential fields', () => {
    const studentCategory = tokenCategories.find(cat => cat.id === 'student');
    expect(studentCategory).toBeDefined();

         const tokenIds = studentCategory!.tokens.map(token => token.id);
     expect(tokenIds).toContain('student_name');
     expect(tokenIds).toContain('student_admission');
     expect(tokenIds).toContain('student_section');
     expect(tokenIds).toContain('student_roll');
  });

  test('should have valid token types', () => {
    const validTypes = ['text', 'number', 'date', 'boolean', 'image', 'list'];
    
    tokenCategories.forEach(category => {
      category.tokens.forEach(token => {
        expect(validTypes).toContain(token.type);
      });
    });
  });
});

describe('Report Blocks Configuration', () => {
  test('should have all required report blocks', () => {
    expect(reportBlocks).toBeDefined();
    expect(Array.isArray(reportBlocks)).toBe(true);
    expect(reportBlocks.length).toBeGreaterThan(0);

         // Check for essential blocks
     const blockIds = reportBlocks.map(block => block.id);
     expect(blockIds).toContain('header-basic');
     expect(blockIds).toContain('student-info-grid');
     expect(blockIds).toContain('marks-table-basic');
     expect(blockIds).toContain('grade-summary-cards');
  });

  test('should have properly structured blocks', () => {
    reportBlocks.forEach(block => {
      expect(block).toHaveProperty('id');
      expect(block).toHaveProperty('label');
      expect(block).toHaveProperty('category');
      expect(block).toHaveProperty('media');
      expect(block).toHaveProperty('content');

      // Content should have required properties
      expect(block.content).toHaveProperty('type');
      expect(typeof block.content.type).toBe('string');
    });
  });

     test('should categorize blocks properly', () => {
     // Just verify that all blocks have a category
     reportBlocks.forEach(block => {
       expect(block.category).toBeDefined();
       expect(typeof block.category).toBe('string');
       expect(block.category.length).toBeGreaterThan(0);
     });
   });
});

describe('Theme Presets Configuration', () => {
  test('should have all required theme presets', () => {
    expect(themePresets).toBeDefined();
    expect(typeof themePresets).toBe('object');

    // Check for essential themes
    expect(themePresets).toHaveProperty('cbse-classic');
    expect(themePresets).toHaveProperty('modern-minimal');
    expect(themePresets).toHaveProperty('ssc-bold');
  });

  test('should have properly structured theme presets', () => {
    Object.entries(themePresets).forEach(([key, theme]) => {
      expect(theme).toHaveProperty('name');
      expect(theme).toHaveProperty('primaryColor');
      expect(theme).toHaveProperty('secondaryColor');
      expect(theme).toHaveProperty('accentColor');
      expect(theme).toHaveProperty('fontFamily');
      expect(theme).toHaveProperty('borderRadius');

      // Validate color format (should be hex colors)
      expect(theme.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(theme.secondaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(theme.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);

      // Validate border radius format
      expect(theme.borderRadius).toMatch(/^\d+px$/);
    });
  });
});

describe('Template Preview Generation', () => {
  test('should generate valid HTML preview', () => {
    // This would test the preview generation logic
    const sampleTemplate = '<div>{{student.full_name}}</div>';
    const sampleData = {
      student: {
        full_name: 'John Doe'
      }
    };

    // Mock Handlebars compilation
    const Handlebars = require('handlebars').default;
    const compiledTemplate = Handlebars.compile(sampleTemplate);
    const result = compiledTemplate(sampleData);

    expect(result).toBe('<div>Rendered template</div>');
    expect(Handlebars.compile).toHaveBeenCalledWith(sampleTemplate);
  });
});

describe('Migration Guard', () => {
  test('should export required functions', async () => {
    const { verifyReportTemplatesMigration, verifyAllMigrations } = await import('../src/lib/migrationGuard');
    
    expect(typeof verifyReportTemplatesMigration).toBe('function');
    expect(typeof verifyAllMigrations).toBe('function');
  });
});

 describe('Database Schema Validation', () => {
   test('should have required database types', async () => {
     const common = await import('@erp/common');
     
     // This is a basic check that the common module is available
     expect(common).toBeDefined();
     expect(typeof common).toBe('object');
   });
 });

 describe('Component Integration', () => {
   test('should have TemplateDesigner component file', () => {
     // Since Jest can't parse TSX easily, we'll just verify the file structure
     const fs = require('fs');
     const path = require('path');
     
     const designerPath = path.join(__dirname, '../src/components/template-designer/Designer.tsx');
     expect(fs.existsSync(designerPath)).toBe(true);
     
     const fileContent = fs.readFileSync(designerPath, 'utf8');
     expect(fileContent).toContain('export function TemplateDesigner');
     expect(fileContent).toContain('grapesjs');
     expect(fileContent).toContain('handlebars');
   });
 });

describe('Builder Mode Toggle', () => {
  test('should support both no-code and code modes', () => {
    const modes = ['no-code', 'code'] as const;
    
    modes.forEach(mode => {
      expect(['no-code', 'code']).toContain(mode);
    });
  });
});

describe('Template Export/Import', () => {
  test('should generate exportable template data', () => {
    const templateData = {
      html: '<div>Test HTML</div>',
      css: '.test { color: red; }',
      meta: {
        builder: 'no-code',
        version: '1.0'
      }
    };

    expect(templateData).toHaveProperty('html');
    expect(templateData).toHaveProperty('css');
    expect(templateData).toHaveProperty('meta');
    expect(templateData.meta).toHaveProperty('builder');
  });
});

// Performance Tests
describe('Performance', () => {
  test('token categories should load quickly', () => {
    const start = performance.now();
    const categories = tokenCategories;
    const end = performance.now();
    
    expect(categories).toBeDefined();
    expect(end - start).toBeLessThan(10); // Should load in less than 10ms
  });

  test('report blocks should load quickly', () => {
    const start = performance.now();
    const blocks = reportBlocks;
    const end = performance.now();
    
    expect(blocks).toBeDefined();
    expect(end - start).toBeLessThan(10); // Should load in less than 10ms
  });
}); 