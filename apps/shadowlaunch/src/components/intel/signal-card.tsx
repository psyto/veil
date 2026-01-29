'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Brain, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SignalData {
  id: string;
  createdAt: string | Date;
  type: string;
  severity: string;
  ticker?: string | null;
  marketTitle?: string | null;
  title: string;
  description: string;
  data: Record<string, unknown>;
  sourceType?: string | null;
  sourceHandle?: string | null;
  sourceUrl?: string | null;
}

interface AnalysisResult {
  text: string;
  recommendation: string;
  confidence: string;
}

interface SignalCardProps {
  signal: SignalData;
  isNew?: boolean;
}

export function SignalCard({ signal, isNew }: SignalCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-500 border-red-500/50 bg-red-500/5';
      case 'HIGH':
        return 'text-amber-500 border-amber-500/50 bg-amber-500/5';
      case 'MEDIUM':
        return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/5';
      case 'LOW':
        return 'text-green-500 border-green-500/50 bg-green-500/5';
      default:
        return 'text-green-500 border-green-500/50 bg-green-500/5';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'LOW':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      default:
        return 'bg-green-500/20 text-green-400 border-green-500/50';
    }
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      VOLUME_SPIKE: { label: 'VOLUME', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' },
      WHALE_ALERT: { label: 'WHALE', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
      SOCIAL_INTEL: { label: 'SOCIAL', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
      PRICE_MOVE: { label: 'PRICE', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
      SPREAD_CHANGE: { label: 'SPREAD', color: 'bg-pink-500/20 text-pink-400 border-pink-500/50' },
    };
    return badges[type] || { label: type, color: 'bg-gray-500/20 text-gray-400 border-gray-500/50' };
  };

  const getRecommendationIcon = (rec: string) => {
    if (rec.includes('BUY YES') || rec.includes('BULLISH')) {
      return <TrendingUp className="w-4 h-4 text-green-400" />;
    }
    if (rec.includes('BUY NO') || rec.includes('BEARISH') || rec.includes('AVOID')) {
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    }
    return <Minus className="w-4 h-4 text-yellow-400" />;
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH':
        return 'text-green-400';
      case 'MEDIUM':
        return 'text-yellow-400';
      case 'LOW':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatTime = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatTimeAgo = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleAnalyze = async () => {
    if (analysis) {
      setShowAnalysis(!showAnalysis);
      return;
    }

    setIsAnalyzing(true);
    setShowAnalysis(true);

    try {
      const response = await fetch('/api/intel/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      console.error('Analysis error:', err);
      setAnalysis({
        text: 'Analysis unavailable. Please try again.',
        recommendation: 'HOLD',
        confidence: 'LOW',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const typeBadge = getTypeBadge(signal.type);
  const severityColors = getSeverityColor(signal.severity);

  return (
    <div
      className={`border rounded ${severityColors} font-mono transition-all duration-500 ${
        isNew ? 'animate-pulse ring-2 ring-green-500/50' : ''
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-inherit">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 text-xs border rounded ${getSeverityBadgeColor(signal.severity)}`}>
            {signal.severity}
          </span>
          <span className={`px-2 py-0.5 text-xs border rounded ${typeBadge.color}`}>
            {typeBadge.label}
          </span>
          <span className="text-xs opacity-60">{formatTime(signal.createdAt)}</span>
          {isNew && (
            <span className="px-2 py-0.5 text-xs bg-green-500/30 text-green-300 border border-green-500/50 rounded animate-pulse">
              NEW
            </span>
          )}
        </div>
        <span className="text-xs opacity-60 hidden sm:inline">{formatTimeAgo(signal.createdAt)}</span>
      </div>

      {/* Content */}
      <div className="px-3 py-3">
        {/* ASCII box for title */}
        <div className="mb-2">
          <div className="text-xs opacity-40">┌{'─'.repeat(Math.min(signal.title.length + 2, 50))}┐</div>
          <div className="flex">
            <span className="text-xs opacity-40">│ </span>
            <span className="text-sm font-bold">{signal.title}</span>
            <span className="text-xs opacity-40"> │</span>
          </div>
          <div className="text-xs opacity-40">└{'─'.repeat(Math.min(signal.title.length + 2, 50))}┘</div>
        </div>

        {/* Market info */}
        {signal.marketTitle && (
          <div className="text-sm mb-2 opacity-80">
            <span className="opacity-60">Market:</span> {signal.marketTitle}
          </div>
        )}

        {/* Description */}
        <div className="text-sm mb-3 leading-relaxed">
          <span className="opacity-60">&gt;</span> {signal.description}
        </div>

        {/* Source info for social signals */}
        {signal.sourceType === 'TWITTER' && signal.sourceHandle && (
          <div className="text-xs opacity-60 mb-3">
            Source: @{signal.sourceHandle}
            {signal.sourceUrl && (
              <a
                href={signal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
              >
                View <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* AI Analysis Section */}
        {showAnalysis && (
          <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-purple-400 font-bold">AI ANALYSIS</span>
            </div>

            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-purple-300 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="animate-pulse">Analyzing market data...</span>
              </div>
            ) : analysis ? (
              <div className="space-y-2">
                <p className="text-sm text-purple-200 leading-relaxed">{analysis.text}</p>
                <div className="flex items-center gap-4 pt-2 border-t border-purple-500/20">
                  <div className="flex items-center gap-1">
                    {getRecommendationIcon(analysis.recommendation)}
                    <span className="text-xs font-bold">{analysis.recommendation}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs opacity-60">Confidence:</span>
                    <span className={`text-xs font-bold ${getConfidenceColor(analysis.confidence)}`}>
                      {analysis.confidence}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* AI Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-3 py-1.5 text-xs border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 disabled:opacity-50 rounded transition-colors flex items-center gap-1"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Brain className="w-3 h-3" />
            )}
            {analysis ? (showAnalysis ? '[HIDE ANALYSIS]' : '[SHOW ANALYSIS]') : '[ANALYZE]'}
          </button>

          {signal.ticker && (
            <Link
              href={`/markets/${signal.ticker}`}
              className="px-3 py-1.5 text-xs border border-green-500/50 text-green-400 hover:bg-green-500/10 rounded transition-colors"
            >
              [VIEW MARKET]
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
