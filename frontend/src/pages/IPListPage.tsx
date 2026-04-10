import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Download, Search, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import type { IP, SubnetDetail } from '../types';
import * as ipApi from '../api/ips';
import * as subnetApi from '../api/subnets';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';

function IPForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: IP;
  onSave: () => void;
  onClose: () => void;
}) {
  const { subnetId } = useParams<{ subnetId: string }>();
  const [address, setAddress] = useState(initial?.IpAddress ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        await ipApi.updateIP(Number(subnetId), initial.IpId, address);
        toast.success('IP updated');
      } else {
        await ipApi.addIP(Number(subnetId), address);
        toast.success('IP added');
      }
      onSave();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save IP');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. 192.168.1.10"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : initial ? 'Update' : 'Add IP'}
        </button>
      </div>
    </form>
  );
}

export default function IPListPage() {
  const { subnetId } = useParams<{ subnetId: string }>();
  const navigate = useNavigate();
  const [subnet, setSubnet] = useState<SubnetDetail | null>(null);
  const [ips, setIPs] = useState<IP[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<IP | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IP | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    subnetApi.getSubnet(Number(subnetId)).then(setSubnet).catch(() => toast.error('Subnet not found'));
  }, [subnetId]);

  const loadIPs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ipApi.getIPs(Number(subnetId), page, 10, search);
      setIPs(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      toast.error('Failed to load IPs');
    } finally {
      setLoading(false);
    }
  }, [subnetId, page, search]);

  useEffect(() => { loadIPs(); }, [loadIPs]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await ipApi.deleteIP(Number(subnetId), deleteTarget.IpId);
      toast.success('IP deleted');
      setDeleteTarget(null);
      loadIPs();
    } catch {
      toast.error('Failed to delete IP');
    }
  }

  return (
    <div className="p-6">
      <button
        onClick={() => navigate('/subnets')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-4"
      >
        <ArrowLeft size={15} />
        Back to Subnets
      </button>

      {subnet && (
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{subnet.SubnetName}</h1>
              <p className="text-blue-700 font-mono mt-1">{subnet.SubnetAddress}</p>
            </div>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              <Info size={15} />
              Network Info
            </button>
          </div>

          {showInfo && subnet.networkInfo && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4 grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Network:</span> <span className="font-mono">{subnet.networkInfo.networkAddress}</span></div>
              <div><span className="text-gray-500">Broadcast:</span> <span className="font-mono">{subnet.networkInfo.broadcastAddress}</span></div>
              <div><span className="text-gray-500">First Usable:</span> <span className="font-mono">{subnet.networkInfo.firstUsable}</span></div>
              <div><span className="text-gray-500">Last Usable:</span> <span className="font-mono">{subnet.networkInfo.lastUsable}</span></div>
              <div><span className="text-gray-500">Total Hosts:</span> {subnet.networkInfo.totalHosts.toLocaleString()}</div>
              <div><span className="text-gray-500">Usable Hosts:</span> {subnet.networkInfo.usableHosts.toLocaleString()}</div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{total} IP addresses</p>
        <div className="flex gap-2">
          <button
            onClick={() => ipApi.exportIPsCSV(ips, subnet?.SubnetAddress ?? '')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            onClick={() => { setSelected(null); setModal('create'); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={15} />
            Add IP
          </button>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput); }}
        className="flex gap-2 mb-4"
      >
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter by IP address…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="submit" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">
          Search
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">IP Address</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Added By</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Added On</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : ips.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">No IPs found</td></tr>
            ) : (
              ips.map((ip) => (
                <tr key={ip.IpId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-900">{ip.IpAddress}</td>
                  <td className="px-4 py-3 text-gray-500">{ip.CreatedByEmail}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(ip.CreatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setSelected(ip); setModal('edit'); }}
                        className="p-1.5 text-gray-500 hover:text-yellow-600 rounded"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(ip)}
                        className="p-1.5 text-gray-500 hover:text-red-600 rounded"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'create' ? 'Add IP Address' : 'Edit IP Address'}
          onClose={() => setModal(null)}
        >
          <IPForm
            initial={modal === 'edit' ? (selected ?? undefined) : undefined}
            onSave={() => { setModal(null); loadIPs(); }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete IP" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Remove <strong className="font-mono">{deleteTarget.IpAddress}</strong> from this subnet?
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
