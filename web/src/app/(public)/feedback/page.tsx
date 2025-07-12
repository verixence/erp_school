'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Send, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface School {
  id: string
  name: string
}

export default function PublicFeedbackForm() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  
  const [formData, setFormData] = useState({
    school_id: '',
    type: 'feedback',
    subject: '',
    description: '',
    submitter_name: '',
    submitter_email: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch schools when component mounts
  useEffect(() => {
    fetchSchools()
  }, [])

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/schools')
      if (response.ok) {
        const data = await response.json()
        setSchools(data.schools || [])
      }
    } catch (error) {
      console.error('Failed to fetch schools:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.school_id) {
      newErrors.school_id = 'Please select a school'
    }
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required'
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }
    if (!isAnonymous) {
      if (!formData.submitter_name.trim()) {
        newErrors.submitter_name = 'Name is required for non-anonymous feedback'
      }
      if (!formData.submitter_email.trim()) {
        newErrors.submitter_email = 'Email is required for non-anonymous feedback'
      } else if (!/\S+@\S+\.\S+/.test(formData.submitter_email)) {
        newErrors.submitter_email = 'Please enter a valid email address'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const submissionData = {
        ...formData,
        is_anonymous: isAnonymous,
        submitter_name: isAnonymous ? null : formData.submitter_name,
        submitter_email: isAnonymous ? null : formData.submitter_email
      }

      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      })

      if (response.ok) {
        setSubmitted(true)
        setFormData({
          school_id: '',
          type: 'feedback',
          subject: '',
          description: '',
          submitter_name: '',
          submitter_email: ''
        })
        setIsAnonymous(false)
      } else {
        const error = await response.json()
        if (error.error === 'Rate limit exceeded') {
          alert('You have submitted too many feedback items recently. Please wait before submitting again.')
        } else {
          throw new Error(error.error || 'Failed to submit feedback')
        }
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-6">
              Your feedback has been submitted successfully. The school administration will review it promptly.
            </p>
            <Button 
              onClick={() => setSubmitted(false)}
              className="w-full"
            >
              Submit Another Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            <CardTitle className="text-2xl font-bold">School Feedback</CardTitle>
          </div>
          <p className="text-gray-600">
            Share your thoughts, suggestions, or concerns with the school administration.
            Your feedback helps us improve our services.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* School Selection */}
            <div>
              <Label htmlFor="school_id">Select School *</Label>
              <Select 
                value={formData.school_id} 
                onValueChange={(value) => setFormData({...formData, school_id: value})}
              >
                <SelectTrigger className={errors.school_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Choose your school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.school_id && (
                <p className="text-red-500 text-sm mt-1">{errors.school_id}</p>
              )}
            </div>

            {/* Feedback Type */}
            <div>
              <Label htmlFor="type">Feedback Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({...formData, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feedback">General Feedback</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Anonymous Toggle */}
            <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
              <Label htmlFor="anonymous" className="cursor-pointer">
                Submit anonymously
              </Label>
            </div>

            {/* Contact Information (if not anonymous) */}
            {!isAnonymous && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="submitter_name">Your Name *</Label>
                  <Input
                    id="submitter_name"
                    value={formData.submitter_name}
                    onChange={(e) => setFormData({...formData, submitter_name: e.target.value})}
                    placeholder="Enter your full name"
                    className={errors.submitter_name ? 'border-red-500' : ''}
                  />
                  {errors.submitter_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.submitter_name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="submitter_email">Your Email *</Label>
                  <Input
                    id="submitter_email"
                    type="email"
                    value={formData.submitter_email}
                    onChange={(e) => setFormData({...formData, submitter_email: e.target.value})}
                    placeholder="Enter your email address"
                    className={errors.submitter_email ? 'border-red-500' : ''}
                  />
                  {errors.submitter_email && (
                    <p className="text-red-500 text-sm mt-1">{errors.submitter_email}</p>
                  )}
                </div>
              </div>
            )}

            {/* Subject */}
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Brief description of your feedback"
                className={errors.subject ? 'border-red-500' : ''}
              />
              {errors.subject && (
                <p className="text-red-500 text-sm mt-1">{errors.subject}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Please provide detailed feedback..."
                rows={5}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            {/* Privacy Notice */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {isAnonymous ? (
                  "Your feedback will be submitted anonymously. The school will not be able to identify you or respond directly."
                ) : (
                  "Your contact information will be shared with the school administration. They may contact you for follow-up if needed."
                )}
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>Loading...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </form>

          {/* Rate Limiting Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              To prevent spam, you can submit up to 5 feedback items per hour.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 