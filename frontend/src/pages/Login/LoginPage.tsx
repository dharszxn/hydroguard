import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, Tabs, Alert, Spin, Select, message } from 'antd';
import { ShieldCheck, Lock, Mail, UserPlus, KeyRound, User as UserIcon } from 'lucide-react';
import { authService } from '../../services/api';
import { User } from '../../types';
import { tokens } from '../../styles/tokens';

interface LoginPageProps {
  onLoginSuccess: (user: User, token?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [setupForm] = Form.useForm();

  const checkStatus = async () => {
    setCheckingSetup(true);
    try {
      const res = await authService.getSetupStatus();
      setIsSetupRequired(res.is_setup_required);
    } catch (e) {
      // If error, default to standard login
      setIsSetupRequired(false);
    } finally {
      setCheckingSetup(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // First-time administrator creation
  const handleSetupAdmin = async (values: any) => {
    setLoading(true);
    try {
      const res = await authService.setupAdmin({
        full_name: values.full_name,
        email: values.email,
        password: values.password
      });
      message.success(`Administrator account created successfully. Welcome, ${res.user.full_name}`);
      onLoginSuccess(res.user, res.access_token);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to initialize administrator account');
    } finally {
      setLoading(false);
    }
  };

  // Standard user login
  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const res = await authService.login(values.email, values.password);
      message.success(`Authenticated as ${res.user.full_name}`);
      onLoginSuccess(res.user, res.access_token);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Invalid industrial login credentials');
    } finally {
      setLoading(false);
    }
  };

  // Genuine user registration
  const handleRegister = async (values: any) => {
    setLoading(true);
    try {
      const res = await authService.register({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        role: values.role
      });
      message.success(`Account registered successfully as ${res.user.role}. Logging in...`);
      onLoginSuccess(res.user, res.access_token);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tokens.colors.bgPage }}>
        <Spin size="large" tip="Connecting to SCADA Authentication Service..." />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.bgPage,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        width: 460,
        background: '#FFFFFF',
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: 4,
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        overflow: 'hidden'
      }}>
        {/* Header Branding */}
        <div style={{ background: tokens.colors.navy, padding: '24px 28px', color: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              background: tokens.colors.steel,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShieldCheck size={24} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.5px', lineHeight: 1.2 }}>
                HYDROGUARD
              </div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                Hydraulic Oil & Leakage Monitoring System
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 10, background: 'rgba(255,255,255,0.12)', padding: '4px 8px', borderRadius: 3 }}>
            PS-021: Smart Detection and Monitoring of Hydraulic Oil Leakage
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px 28px' }}>
          {isSetupRequired ? (
            /* First-Time Administrator Setup Flow */
            <div>
              <Alert
                type="info"
                showIcon
                message="First-Time Administrator Setup"
                description="No registered accounts exist in this installation. Please establish the primary administrator account."
                style={{ marginBottom: 18 }}
              />

              <Form form={setupForm} layout="vertical" onFinish={handleSetupAdmin}>
                <Form.Item
                  name="full_name"
                  label="Administrator Full Name"
                  rules={[{ required: true, message: 'Please enter administrator name' }]}
                >
                  <Input prefix={<UserIcon size={14} color="#6C757D" />} placeholder="e.g. Lead Plant Engineer" />
                </Form.Item>

                <Form.Item
                  name="email"
                  label="Official Work Email"
                  rules={[
                    { required: true, message: 'Please enter valid work email' },
                    { type: 'email', message: 'Enter a valid email address' }
                  ]}
                >
                  <Input prefix={<Mail size={14} color="#6C757D" />} placeholder="admin@facility.com" />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Master Password"
                  rules={[
                    { required: true, message: 'Please set a secure password' },
                    { min: 6, message: 'Password must be at least 6 characters' }
                  ]}
                >
                  <Input.Password prefix={<Lock size={14} color="#6C757D" />} placeholder="••••••••" />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  style={{ background: tokens.colors.navy, borderColor: tokens.colors.navy, height: 38, fontWeight: 600, marginTop: 8 }}
                >
                  Initialize System Administrator
                </Button>
              </Form>
            </div>
          ) : (
            /* Standard Login / User Registration Tabs */
            <div>
              <Tabs
                activeKey={activeTab}
                onChange={(k) => setActiveTab(k as any)}
                items={[
                  {
                    key: 'login',
                    label: 'Operator Sign In',
                    children: (
                      <Form form={loginForm} layout="vertical" onFinish={handleLogin} style={{ marginTop: 8 }}>
                        <Form.Item
                          name="email"
                          label="Work Email Address"
                          rules={[
                            { required: true, message: 'Please enter your registered email' },
                            { type: 'email', message: 'Enter a valid email' }
                          ]}
                        >
                          <Input prefix={<Mail size={14} color="#6C757D" />} placeholder="name@facility.com" />
                        </Form.Item>

                        <Form.Item
                          name="password"
                          label="Password"
                          rules={[{ required: true, message: 'Please enter your password' }]}
                        >
                          <Input.Password prefix={<Lock size={14} color="#6C757D" />} placeholder="••••••••" />
                        </Form.Item>

                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          block
                          style={{ background: tokens.colors.navy, borderColor: tokens.colors.navy, height: 38, fontWeight: 600, marginTop: 4 }}
                        >
                          Sign In to SCADA Console
                        </Button>
                      </Form>
                    )
                  },
                  {
                    key: 'register',
                    label: 'Register New Operator',
                    children: (
                      <Form form={registerForm} layout="vertical" onFinish={handleRegister} initialValues={{ role: 'Operator' }} style={{ marginTop: 8 }}>
                        <Form.Item
                          name="full_name"
                          label="Full Name"
                          rules={[{ required: true, message: 'Please enter full name' }]}
                        >
                          <Input prefix={<UserIcon size={14} color="#6C757D" />} placeholder="Engineer / Operator Name" />
                        </Form.Item>

                        <Form.Item
                          name="email"
                          label="Work Email"
                          rules={[
                            { required: true, message: 'Please enter work email' },
                            { type: 'email', message: 'Enter a valid email' }
                          ]}
                        >
                          <Input prefix={<Mail size={14} color="#6C757D" />} placeholder="operator@facility.com" />
                        </Form.Item>

                        <Form.Item
                          name="password"
                          label="Password"
                          rules={[
                            { required: true, message: 'Please set a password' },
                            { min: 6, message: 'Minimum 6 characters' }
                          ]}
                        >
                          <Input.Password prefix={<Lock size={14} color="#6C757D" />} placeholder="••••••••" />
                        </Form.Item>

                        <Form.Item
                          name="role"
                          label="Assigned System Role"
                          rules={[{ required: true }]}
                        >
                          <Select
                            options={[
                              { value: 'Operator', label: 'Operator (Monitoring & Acknowledgment)' },
                              { value: 'Maintenance Technician', label: 'Maintenance Technician (Investigation & Repair)' },
                              { value: 'Administrator', label: 'Administrator (Full System Configuration)' },
                            ]}
                          />
                        </Form.Item>

                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          block
                          style={{ background: tokens.colors.navy, borderColor: tokens.colors.navy, height: 38, fontWeight: 600, marginTop: 4 }}
                        >
                          Register Account
                        </Button>
                      </Form>
                    )
                  }
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
