import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export interface ReportTemplate {
  id: string;
  school_id: string;
  name: string;
  board: 'CBSE' | 'ICSE' | 'State' | 'IB' | 'IGCSE';
  class_range: string;
  is_default: boolean;
  grade_rules: {
    gradeBands: Array<{
      min: number;
      max: number;
      grade: string;
      gpa: number;
      color: string;
    }>;
    calculationType: 'percentage' | 'gpa' | 'weighted';
    weights: Record<string, number>;
    passMarks: number;
  };
  i18n_bundle: Record<string, Record<string, string>>;
  template_html: string;
  template_css: string;
  meta: {
    paperSize: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    showWatermark: boolean;
    showSchoolLogo: boolean;
    version: string;
  };
  json: Record<string, any>; // Legacy field
  created_at: string;
  updated_at: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  board: string;
  created_at: string;
}

export interface CreateReportTemplateData {
  name: string;
  board: 'CBSE' | 'ICSE' | 'State' | 'IB' | 'IGCSE';
  class_range: string;
  grade_rules?: ReportTemplate['grade_rules'];
  i18n_bundle?: ReportTemplate['i18n_bundle'];
  template_html?: string;
  template_css?: string;
  meta?: ReportTemplate['meta'];
  is_default?: boolean;
}

export interface UpdateReportTemplateData extends Partial<CreateReportTemplateData> {
  id: string;
}

// Hooks for Report Templates
export const useReportTemplates = (schoolId?: string) => {
  return useQuery({
    queryKey: ['report-templates', schoolId],
    queryFn: async () => {
      let query = supabase
        .from('report_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ReportTemplate[];
    },
    enabled: !!schoolId,
  });
};

export const useReportTemplate = (id: string) => {
  return useQuery({
    queryKey: ['report-template', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as ReportTemplate;
    },
    enabled: !!id,
  });
};

export const useTemplateCategories = (board?: string) => {
  return useQuery({
    queryKey: ['template-categories', board],
    queryFn: async () => {
      let query = supabase
        .from('template_categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (board) {
        query = query.eq('board', board);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TemplateCategory[];
    },
  });
};

export const useCreateReportTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateData: CreateReportTemplateData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      // If this is being set as default, unset other defaults first
      if (templateData.is_default) {
        await supabase
          .from('report_templates')
          .update({ is_default: false })
          .eq('school_id', userData.school_id);
      }

      const { data, error } = await supabase
        .from('report_templates')
        .insert({
          ...templateData,
          school_id: userData.school_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ReportTemplate;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    },
  });
};

export const useUpdateReportTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateReportTemplateData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      // If this is being set as default, unset other defaults first
      if (updateData.is_default) {
        await supabase
          .from('report_templates')
          .update({ is_default: false })
          .eq('school_id', userData.school_id)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('report_templates')
        .update(updateData)
        .eq('id', id)
        .eq('school_id', userData.school_id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ReportTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      queryClient.invalidateQueries({ queryKey: ['report-template', data.id] });
    },
  });
};

export const useDeleteReportTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      const { error } = await supabase
        .from('report_templates')
        .delete()
        .eq('id', id)
        .eq('school_id', userData.school_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    },
  });
};

export const useDuplicateReportTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.school_id) throw new Error('No school associated');

      // Get the original template
      const { data: originalTemplate, error: fetchError } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', templateId)
        .eq('school_id', userData.school_id)
        .single();
      
      if (fetchError) throw fetchError;

      // Create duplicate with modified name
      const { data, error } = await supabase
        .from('report_templates')
        .insert({
          ...originalTemplate,
          id: undefined, // Let the database generate new ID
          name: `${originalTemplate.name} (Copy)`,
          is_default: false, // Duplicates should not be default
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ReportTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    },
  });
};

// Hook to preview report template
export const usePreviewReportTemplate = () => {
  return useMutation({
    mutationFn: async ({ 
      templateId, 
      sampleData,
      language = 'en' 
    }: { 
      templateId: string; 
      sampleData: any;
      language?: string; 
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // For now, return a simple HTML structure
      // In production, this would call a Supabase Edge Function
      // that uses Handlebars to render the template
      const { data: template } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!template) throw new Error('Template not found');

      // Simple template rendering - replace with Handlebars in production
      let html = template.template_html || '';
      let css = template.template_css || '';

      // Replace CSS placeholder
      html = html.replace('{{{css}}}', css);

      // Simple variable replacement for preview
      const replaceVariables = (str: string, data: any, prefix = '') => {
        let result = str;
        
        Object.keys(data).forEach(key => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          const value = data[key];
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result = replaceVariables(result, value, fullKey);
          } else {
            const regex = new RegExp(`{{${fullKey}}}`, 'g');
            result = result.replace(regex, String(value || ''));
          }
        });
        
        return result;
      };

      html = replaceVariables(html, sampleData);

      // Handle simple each loops for subjects
      const subjectsMatch = html.match(/{{#each subjects}}([\s\S]*?){{\/each}}/);
      if (subjectsMatch && sampleData.subjects) {
        const template = subjectsMatch[1];
        const rendered = sampleData.subjects.map((subject: any) => {
          return replaceVariables(template, subject, 'this');
        }).join('');
        html = html.replace(subjectsMatch[0], rendered);
      }

      // Handle conditional logic
      html = html.replace(/{{#if (.*?)}}([\s\S]*?){{\/if}}/g, (match: string, condition: string, content: string) => {
        const value = condition.split('.').reduce((obj: any, key: string) => obj && obj[key], sampleData);
        return value ? content : '';
      });

      return { html };
    },
  });
}; 

// Template Catalogue Functions
export async function getPublicTemplates(
  filters?: {
    board?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
) {
  const query = supabase
    .from('report_templates')
    .select(`
      id,
      name,
      board,
      class_range,
      preview_image_url,
      usage_count,
      last_used_at,
      created_at,
      meta,
      grade_rules,
      i18n_bundle
    `)
    .eq('is_public', true)
    .order('usage_count', { ascending: false });

  if (filters?.board) {
    query.eq('board', filters.board);
  }

  if (filters?.search) {
    query.ilike('name', `%${filters.search}%`);
  }

  if (filters?.limit) {
    query.limit(filters.limit);
  }

  if (filters?.offset) {
    query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching public templates:', error);
    throw new Error('Failed to fetch public templates');
  }

  return data || [];
}

export async function cloneTemplateForSchool(templateId: string, schoolId: string) {
  const { data, error } = await supabase.rpc('clone_template_for_school', {
    template_id: templateId,
    target_school_id: schoolId
  });

  if (error) {
    console.error('Error cloning template:', error);
    throw new Error('Failed to clone template: ' + error.message);
  }

  return data; // Returns the new template ID
}

export async function getTemplateDetails(templateId: string) {
  const { data, error } = await supabase
    .from('report_templates')
    .select(`
      *,
      created_by_user:users!created_by(
        full_name,
        email
      ),
      origin_template:report_templates!origin_template_id(
        name,
        created_by
      )
    `)
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching template details:', error);
    throw new Error('Failed to fetch template details');
  }

  return data;
}

export async function updateTemplateMetadata(
  templateId: string,
  updates: {
    name?: string;
    preview_image_url?: string;
    is_public?: boolean;
    editable_by_school?: boolean;
    meta?: any;
  }
) {
  const { data, error } = await supabase
    .from('report_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating template metadata:', error);
    throw new Error('Failed to update template metadata');
  }

  return data;
}

export async function checkMigrations() {
  const { data, error } = await supabase.rpc('check_migrations');

  if (error) {
    console.error('Error checking migrations:', error);
    return false;
  }

  return data === true;
}

export async function getTemplateUsageStats(templateId: string) {
  const { data, error } = await supabase
    .from('report_templates')
    .select('usage_count, last_used_at')
    .eq('origin_template_id', templateId);

  if (error) {
    console.error('Error fetching template usage stats:', error);
    throw new Error('Failed to fetch template usage stats');
  }

  const totalUsage = data?.reduce((sum, template) => sum + (template.usage_count || 0), 0) || 0;
  const lastUsed = data?.reduce((latest, template) => {
    const templateDate = template.last_used_at ? new Date(template.last_used_at) : null;
    const latestDate = latest ? new Date(latest) : null;
    
    if (!templateDate) return latest;
    if (!latestDate) return template.last_used_at;
    
    return templateDate > latestDate ? template.last_used_at : latest;
  }, null as string | null);

  return {
    totalClones: data?.length || 0,
    totalUsage,
    lastUsed
  };
}

export async function getSchoolTemplates(schoolId: string) {
  const { data, error } = await supabase
    .from('report_templates')
    .select(`
      *,
      origin_template:report_templates!origin_template_id(
        name,
        board,
        preview_image_url
      )
    `)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching school templates:', error);
    throw new Error('Failed to fetch school templates');
  }

  return data || [];
} 