import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, Download, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Subnet } from '../types';
import * as subnetApi from '../api/subnets';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';

function SubnetForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Subnet;
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.SubnetName ?? '');
  const [address, setAddress] = useState(initial?.SubnetAddress ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        await subnetApi.updateSubnet(initial.SubnetId, {
          SubnetName: name,
          SubnetAddress: address,
        });
        toast.success('Subnet updated');
      } else {
        await subnetApi.createSubnet(name, address);
        toast.success('Subnet created');
      }
      onSave();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save subnet');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subnet Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Office LAN"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subnet Address (CIDR)
        </label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. 192.168.1.0/24"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : initial ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

export default function SubnetListPage() {
  const navigate = useNavigate();
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Subnet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subnet | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await subnetApi.getSubnets(page, 10, search);
      setSubnets(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      toast.error('Failed to load subnets');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await subnetApi.deleteSubnet(deleteTarget.SubnetId);
      toast.success('Subnet deleted');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Failed to delete subnet');
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subnets</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total subnets</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => subnetApi.exportSubnetsCSV(subnets)}
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
            Add Subnet
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or address…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Search
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Address</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">IPs</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created By</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : subnets.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  No subnets found
                </td>
              </tr>
            ) : (
              subnets.map((s) => (
                <tr key={s.SubnetId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.SubnetName}</td>
                  <td className="px-4 py-3 font-mono text-blue-700">{s.SubnetAddress}</td>
                  <td className="px-4 py-3 text-gray-600">{s.IpCount}</td>
                  <td className="px-4 py-3 text-gray-500">{s.CreatedByEmail}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(s.CreatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => navigate(`/subnets/${s.SubnetId}/ips`)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 rounded"
                        title="View IPs"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => { setSelected(s); setModal('edit'); }}
                        className="p-1.5 text-gray-500 hover:text-yellow-600 rounded"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="p-1.5 text-gray-500 hover:text-red-600 rounded"
                        title="Delete"
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
          title={modal === 'create' ? 'New Subnet' : 'Edit Subnet'}
          onClose={() => setModal(null)}
        >
          <SubnetForm
            initial={modal === 'edit' ? (selected ?? undefined) : undefined}
            onSave={() => { setModal(null); load(); }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Subnet" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Delete <strong>{deleteTarget.SubnetName}</strong> ({deleteTarget.SubnetAddress}) and
            all its IPs? This action cannot be easily undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
